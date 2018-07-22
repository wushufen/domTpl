/*!
 * https://github.com/wusfen/domTpl
 */
;
(function(global, document) {

    var debug = location.href.match(/[?&]debug/);

    function compile(node) {
        // node = node || document.body.parentNode;

        var code = 'var _$ = arguments.callee\n';

        (function scan(node, owner) { // owner for ie xx ownerElement
            // console.log(node.nodeName + ': ' +(node.nodeValue||node.innerHTML))

            if (node.nodeType == 1 && !node.nid) { // && 防止重复
                var nid;

                // each start: each 最优先，其它指令归为克隆节点
                var eachStr = getAttr(node, 'each');
                if (eachStr) {
                    var nid = nid || setNodeId(node);
                    var item_list = eachStr.split(' in ');
                    code += indent(+1) + '_$.each(' + nid + ', ' + tryValue(item_list[1], '[]') + ', function(' + item_list[0] + ', $index){\n';
                    // code += indent(+1) + '_$.each(' + nid + ', ' + item_list[1] + ', function(' + item_list[0] + ', $index){\n';
                    scanChildren();
                    // code += indent(-1) + '})\n'; // to: each end
                }

                // if
                var ifStr = getAttr(node, 'if');
                if (validate(ifStr, node)) {
                    var nid = nid || setNodeId(node);
                    code += indent(+1) + '_$.if_(' + nid + ', ' + tryValue(ifStr, '0') + ', function(){\n';
                    // code += indent(+1) + '_$.if_(' + nid + ', ' + ifStr + ', function(){\n';
                    scanChildren(); // ** 不能重复处理子节点。 内部已使用 hasScanChildren 判断
                    code += indent(-1) + '})\n';
                }

                // model
                // model 先于 on 可确保已赋值不被 input 先冲掉
                var modelStr = getAttr(node, 'model');
                if (validate(modelStr, node)) {
                    var nid = nid || setNodeId(node);
                    var m = modelStr.match(/(.+)\.(.+)/);
                    var obj = m ?
                        // obj.key
                        'typeof ' + m[1] + '=="object"?' + m[1] + ':(_data_.' + m[1] + '={})' :
                        // each arr item
                        // _data_.model
                        'this[$index]===' + modelStr + '?this:_data_';
                    var key = m ? '"' + m[2] + '"' : 'this[$index]===' + modelStr + '?$index:"' + modelStr + '"';
                    code += indent() + '_$.model(' + nid + ', ' + obj + ', ' + key + ', _data_)\n';
                }

                // on
                var events = 'input,abort,blur,change,click,dblclick,error,focus,keydown,keypress,keyup,load,mousedown,mousemove,mouseout,mouseover,mouseup,reset,resize,select,submit,unload'.split(',');
                for (var i = 0; i < events.length; i++) {
                    var event = events[i];
                    var onStr = getAttr(node, event);
                    if (validate(onStr, node)) {
                        var nid = nid || setNodeId(node);
                        code += indent() + '_$.on(' + nid + ', "' + event + '", function($this, $event){(function(){' + onStr + '}).apply(_data_)}, _data_)\n'; // apply this 绑定
                    }
                }

                // text
                // ie getAttribute('text') 属性并不是获取书写时的值，而是获取 innerHTML
                var textStr = getAttr(node, 'text');
                if (validate(textStr, node)) {
                    var nid = nid || setNodeId(node);
                    code += indent() + '_$.text(' + nid + ', ' + tryValue(textStr, '""') + ')\n';
                }

                // html
                var htmlStr = getAttr(node, 'html');
                if (validate(htmlStr, node)) {
                    var nid = nid || setNodeId(node);
                    code += indent() + '_$.html(' + nid + ', ' + tryValue(htmlStr, '""') + ')\n';
                }

                // each end
                if (eachStr) {
                    code += indent(-1) + '})\n';
                }

                // if (!eachStr && !ifStr) 
                scanChildren();

                var hasScanChildren = false; // each if 只能 scanChildren 一次
                function scanChildren() {
                    if (hasScanChildren) {
                        return;
                    }
                    hasScanChildren = true;

                    var attributes = toArray(node.attributes);
                    for (var i = 0; i < attributes.length; i++) {
                        attributes[i].specified && scan(attributes[i], node); // owner for ie
                    }
                    var childNodes = toArray(node.childNodes);
                    for (var i = 0; i < childNodes.length; i++) {
                        scan(childNodes[i]);
                    }
                }
            } else if (node.nodeType == 2 || node.nodeType == 3) {
                var nodeValue = node.nodeValue + ''; // ie null or bool

                // attr-* :* .*
                var name = node.name + '';
                var attrName = (name.match(/^(attr-|:|\.)(.*)/) || [])[2];
                if (attrName && validate(nodeValue, owner)) {
                    getAttr(owner, name);
                    var ownerNid = setNodeId(owner);

                    switch (attrName) {
                        case 'class':
                            code += indent() + '_$.class_(' + ownerNid + ', ' + tryValue(nodeValue, '{}') + ')\n';
                            break;
                        case 'style':
                            code += indent() + '_$.style(' + ownerNid + ', ' + tryValue(nodeValue, '{}') + ')\n';
                            break;
                        default:
                            code += indent() + '_$.attr(' + ownerNid + ', "' + attrName + '", ' + tryValue(nodeValue, '""') + ', _data_)\n';
                    }
                }

                // {{}}
                if (nodeValue.match('{{')) {
                    var exp = parse(nodeValue);
                    if (validate(exp, node)) {
                        // value
                        var nid = setNodeId(node);
                        code += indent() + '_$.value(' + nid + ', ' + exp + ')\n';
                    }
                }
            }
        })(node);
        // console.log(code);


        var render = Function('_data_', '_data_=_data_||{}\n' + getVars(code) + code);

        render.each = each;
        render.if_ = if_;
        render.value = value;
        render.text = text;
        render.html = html;
        render.attr = attr;
        render.class_ = class_;
        render.style = style;
        render.on = on;
        render.model = model;
        debug && console.info('compile:', render);
        return render
    }


    var inc = 0;
    var nidMap = {};

    // 不传 nid 则自增
    // 克隆时传 nid  'nid.i'
    function setNodeId(node, nid) {
        var hasNid = getNodeId(node);
        if (!nid && hasNid) { // 非克隆并已设置
            return hasNid; // 防止重复
        }

        nid = nid || ++inc;
        // nid => node
        nidMap[nid] = node;
        // node => nid
        if (node.nodeType == 1) {
            node.nid = nid;
        } else if (node.nodeType == 2) { // ie #attr #text 不能设置不存在的属性
            // ie 没有 ownerElement， 所以直接用 nodeValue 保存
            // getNodeId(attr), 只有 each -> cloneNode 时才使用
            // 而 each 原节点会隐藏
            node.nodeValue = nid + ':::';
        } else if (node.nodeType == 3) { // 为了减少遍历，保存 nid 在父节点
            var parentNode = node.parentNode;
            var _nidMap = parentNode.nidMap || (parentNode.nidMap = {});
            _nidMap[nid] = node;
        }
        return nid;
    }

    function getNodeId(node) {
        if (node.nodeType == 1) {
            return node.nid;
        } else if (node.nodeType == 2) {
            return ((node.nodeValue + '').match(/^([\d.]+):::$/) || [])[1];
        } else if (node.nodeType == 3) {
            var parentNode = node.parentNode;
            var _nidMap = parentNode.nidMap || (parentNode.nidMap = {});
            for (var nid in _nidMap) {
                if (_nidMap[nid] == node) {
                    return nid;
                }
            }
        }
    }

    function getNode(nid) {
        return nidMap[nid + each.ii]; //**
    }






    function each(nid, arr, fn) {
        arr = arr || [];
        var node = getNode(nid);
        var mark = setMark(node, 'each');
        var eachII = each.ii; //**
        var lastLength = node.lastLength || 0;
        var length = arr.length || 0; // ||0  二维数组新传了一维[[1,1,1],[2,2,2]] -> [1,2,3] 。第二维 (1).length==undefined。 undefined和数字相比都为false
        for (var i = 0; i < length; i++) {
            each.ii = eachII + '.' + i; //** full nid eg: 3.3.4
            // get or clone node insert
            var _node = getNode(nid) || cloneNode(node, i);
            keepOn(_node, _node.mark || mark); // _node.mark if的位置优先

            fn.call(arr, arr[i], i, arr);
        }
        // remove
        for (var i = length; i < lastLength; i++) {
            each.ii = eachII + '.' + i;
            var _node = getNode(nid);
            remove(_node);
        }
        each.ii = eachII; //**
        node.lastLength = length;
    }
    each.ii = ''; //**


    function cloneNode(node, eachIndex) {
        var _node = node.cloneNode(true);
        // set nid x.y.z
        (function loop(node, _node) {
            var nid = getNodeId(node);
            nid && setNodeId(_node, nid + '.' + eachIndex); //**
            if (node.nodeType == 1) {
                var attributes = node.attributes;
                var _attributes = _node.attributes;
                for (var i = 0; i < attributes.length; i++) {
                    if (attributes[i].specified) {
                        loop(attributes[i], _attributes[i]);
                    }
                }
                var childNodes = node.childNodes;
                var _childNodes = _node.childNodes;
                for (var i = 0; i < childNodes.length; i++) {
                    loop(childNodes[i], _childNodes[i]);
                }
            }
        })(node, _node);
        return _node;
    }

    function value(nid, value) {
        var node = getNode(nid);
        if (node.nodeValue != value) {
            node.nodeValue = value
        }
    }

    var toTextDiv = document.createElement('div');
    var toTextText = document.createTextNode('');
    toTextDiv.appendChild(toTextText);

    function toText(html) {
        toTextText.nodeValue = html;
        return toTextDiv.innerHTML;
    }

    function text(nid, value) {
        var node = getNode(nid);
        if (node._text != value) {
            node.innerHTML = toText(value);
            node._text = value;
        }
    }

    function html(nid, value) {
        var node = getNode(nid);
        if (node.innerHTML != value) {
            node.innerHTML = value
        }
    }

    function attr(nid, name, value) {
        var node = getNode(nid);
        node.setAttribute(name, value);
    }

    function if_(nid, bool, fn) {
        var node = getNode(nid);
        var mark = setMark(node, 'if');
        if (bool) {
            fn && fn();
            keepOn(node, mark);
        } else {
            remove(node);
        }
    }

    function remove(node) {
        var parentNode = node.parentNode;
        if (parentNode && parentNode.nodeType == 1) { // ie parentNode == documentFragment
            parentNode.removeChild(node);
        }
    }

    function keepOn(node, mark) {
        var parentNode = node.parentNode;
        mark = mark || node.mark;
        if (!parentNode || parentNode.nodeType != 1) {
            mark.parentNode.insertBefore(node, mark)
        }
    }

    function setMark(node, name) {
        var mark = node.mark;
        if (!mark) {
            mark = document.createComment('domTpl:' + name + ' ' + getNodeId(node));
            node.parentNode.insertBefore(mark, node);
            node.mark = mark;
            mark.node = node;
            name == 'each' && remove(node);
        }
        return mark;
    }

    function class_(nid, map) {
        var node = getNode(nid);
        var className = node.className;
        for (var name in map) {
            var bool = map[name];
            if (bool) {
                if (!has(name)) node.className += (className ? ' ' : '') + name;
            } else {
                if (has(name)) node.className = className.replace(RegExp('(^|\\s+)' + name + '(?=\\s+|$)', 'g'), '');
            }
        }

        function has(name) {
            return className.match(RegExp('(^|\\s+)' + name + '(\\s+|$)'));
        }
    }

    function style(nid, map) {
        var node = getNode(nid);
        var style = node.style;
        for (var name in map) {
            var Name = name.replace(/(^|-)(.)/g, function($, $1, $2) {
                return $2.toUpperCase();
            });

            style['webkit' + Name] =
                style['moz' + Name] =
                style['ms' + Name] =
                style['o' + Name] =
                style[name] = map[name];
        }
    }

    var eventMap = {
        // 'click':{'3.0': fn1, '3.1': fn2 }
    };

    var addListenner = function() {
        return document.addEventListener ? function(type, fn) {
            document.body.addEventListener(type, fn, 1); // 1 事件捕捉， 因为 focus, blur 等事件不支持冒泡
        } : function(type, fn) {
            document.attachEvent('on' + type, function() {
                fn(window.event);
            });
        }
    }();

    function on(nid, eventType, fn, _data_) {
        var nid = nid + each.ii;
        if (!eventMap[eventType]) {
            eventMap[eventType] = {};

            addListenner(eventType, handler);
            if (eventType == 'model') {
                addListenner('input', handler);
                addListenner('keyup', handler);
                addListenner('change', handler);
            }

            function handler(e) {
                e = e || window.event; // || ie
                var node = e.target || e.srcElement; // || ie

                (function loop(node) {
                    if (!node) return;
                    var nid = getNodeId(node);
                    var fn = eventMap[eventType][nid];
                    if (fn) {
                        // 执行事件回调
                        fn(node, e);
                        // 并更新视图
                        _data_.$render();
                    }
                    loop(node.parentNode);
                })(node);

            }
        }
        eventMap[eventType][nid] = fn;
    }

    function model(nid, obj, key, _data_) {
        var node = getNode(nid);
        var value = obj[key];

        // data->view
        // if (document.activeElement != node && obj[key] + '' !== node.value) {
        // if (obj[key] + '' !== node.value){ // -- ie 如果有 keydown 的话会影响输入
        if (value !== node.value) {
            var selectionStart = node.type == 'text' ? node.selectionStart : 0; // input-range node.selectionStart 会报错
            var bool = selectionStart && selectionStart < node.value.length; // 光标位置 to fix ie

            node.value = value || '';
            obj[key] = node.value; // undefined -> ''  // 或 select 的 option 已不存在

            node.value = obj[key]; // 当 select 的 option 已不存在，把它置为 "";
            obj[key] = node.value; // 再确保是一致的

            bool && (node.selectionStart = node.selectionEnd = selectionStart);
        }

        // view->data
        on(nid, 'model', function() { // 自定义事件 'input' : 'keyup'
            obj[key] = node.value;
        }, _data_);
    }

    function toArray(list) {
        var length = list.length;
        var arr = new Array(length);
        while (length--) {
            arr[length] = list[length];
        }
        return arr;
    }

    function getAttr(node, name) {
        var val = node.getAttribute(name);
        debug || node.removeAttribute(name);
        return val;
    }

    function getVars(code) {
        var arr = code.replace(/\s*\.\s*/, '.') // obj  .  xxx
            .replace(/'[^\']*'|"[^\"]*"|\.[$\w]*/g, '') // 'xxx'  "xxx"  obj.xxx
            .replace(/\b(if|else|switch|case|default|for|continue|do|while|break|function|arguments|return|new|this|instanceof|try|catch|finally|throw|typeof|in|delete|var|true|false|null|void|with)\b/g, '')
            // .match(/[$a-z_A-Z][$\w]*/g);
            .match(/[$a-z_A-Z\u4E00-\u9FA5][$\w\u4E00-\u9FA5]*/g); // 允许中文变量
        var vars = '';
        var map = {};
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            if (!map[item]) {
                // vars += 'var ' + item + ' = _data_.' + item + '||window.' + item + '||""\n';
                // var item="item" in _data_?_data_.item:window.item||""
                // vars += 'var ' + item + '="' + item + '" in _data_?_data_.' + item + ':window.' + item + '||""\n';
                // 'var _data_=_data_||("_data_" in _data_?_data_._data_:window._data_)||""\n'
                // 用 in 判断这种情况  _data_:{key:undefined} window.key = 'xxx'
                vars += 'var ' + item + '=' + item + '||("' + item + '" in _data_?_data_.' + item + ':window.' + item + ')||""\n'
                map[item] = 1;
            }
        }

        return vars;
    }

    function parse(text) {
        // return '"' + text.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+($1)+"') + '"';
        // return '"' + text.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+' + tryValue('$1', '""') + '+"') + '"';
        return '"' + text.replace(/\r?\n/g, '')
            // 边界符外的文本 " \ 转义
            .replace(/(^|}}).*?({{|$)/g, function($) {
                return $.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            })
            .replace(/{{(.*?)}}/g, '"+' + tryValue('$1', '""') + '+"') + '"';
    }

    function validate(code, node) {
        if (!code) return;
        try {
            // !{} 防止对象当代码块解释
            Function((code.match(/^\s*\{/) ? '!' : '') + code); // 语法检测
            return true;
        } catch (e) {
            debug && console.error('domTpl:', node.nodeValue || code, node, e);
        }
    }

    function tryValue(v1, v2) {
        return '(function(){try{return(' + v1 + ')||""}catch(e){return ' + v2 + '}}())';
    }

    function indent(n) {
        var l = indent.n || (indent.n = 1);
        indent.n += n || 0;
        return Array(n > 0 ? l : indent.n).join('  ');
    }

    // replace function, bind this to data and insert $render()
    function replaceFunction(data, $render) {
        for (var name in data) {
            (function() { // closure for fn 
                var fn = data[name];
                if (typeof fn == 'function') {
                    data[name] = function() {
                        fn.apply(data, arguments);
                        $render();
                    };
                    data[name].fn = fn;
                }
            })();
        }
    }

    // api
    var domTpl = function(node, data) {
        if (node && node.constructor == Object) {
            data = node;
            node = 0;
        }
        data = data || {};
        node = node || document.body.parentNode;

        var render = compile(node);
        var t, lastDate = 0;
        var $render = function(data) {
            data && replaceFunction(data, $render);
            data = data || $render.data;
            $render.data = data;
            var now = new Date;
            if (now - 41 > lastDate) { // 过滤频繁更新
                clearTimeout(t);
                lastDate = now;
                render(data);
            } else {
                t = setTimeout(function() {
                    render(data);
                }, 41);
            }
        };
        $render.render = render;
        data.$render = $render;

        // update data
        data.$set = function(_data) {
            for (var key in _data) {
                data[key] = _data[key];
            }
            $render();
        };

        // first render
        $render(data);
        setTimeout($render, 9); // ie6 确保刷新后更新 Input

        // return $render;
        return data;
    };

    domTpl.nidMap = nidMap; // test
    domTpl.eventMap = eventMap; // test

    // export
    if (typeof define == 'function') {
        define(function(require, exports, module) {
            return module.exports = domTpl;
        })
    } else {
        global.domTpl = domTpl;
    }

})('undefined' != typeof window ? window : this, document);
