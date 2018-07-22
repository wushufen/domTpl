var debug = true;
var debug = false;

/**********************************************/

var toArray = Array.from || function(list) {
    var length = list.length;
    var arr = Array(length);
    while (length--) {
        arr[length] = list[length];
    }
    return arr;
};

var extend = Object.assign || function(obj, _obj) {
    for (var key in _obj) {
        if (!_obj.hasOwnProperty('key')) continue;
        obj[key] = _obj[key];
    }
};

function getAttr(node, name) {
    var val = node.getAttribute(name);
    setTimeout(function() {
        debug || node.removeAttribute(name);
    }, 999);
    return val;
}

function getVars(code, ex) {
    var arr = code.replace(/\s*\.\s*/, '.') // obj . key  => obj.key
        .replace(/'[^\']*'|"[^\"]*"|\.[$\w]*|\/\*.*?\*\/|\/\/.*?\n/g, '') // 'xxx'  "xxx"  obj.xxx  /*xxx*/ //xxx
        // todo: $this 也被删了。。
        .replace(/\b(if|else|switch|case|default|for|continue|do|while|break|function|arguments|return|new|class|this|instanceof|try|catch|finally|throw|typeof|in|delete|var|true|false|undefined|null|void|with|window)\b/g, '')
        // .match(/[$a-z_A-Z][$\w]*/g);
        .match(/[$_a-zA-Z\u4E00-\u9FA5][$\w\u4E00-\u9FA5]*/g) || []; // 允许中文变量
    var vars = '';
    var map = {};
    var exs = String(ex).split(',');
    for (var i = 0; i < arr.length; i++) {
        var name = arr[i];
        // 排除的变量
        if (exs.indexOf(name) != -1) {
            continue;
        }
        if (!map[name]) {
            // 
            vars += 'var name = typeof name=="undefined" ? ("name" in _data_ ? _data_.name : window.name) : name;'
                .replace(/name/g, name)

            map[name] = 1;
        }
    }

    // console.log(map)
    return vars + '\n';
}

function parseHtml(tpl) {
    var el = parseHtml.el || (parseHtml.el = document.createElement('div'));
    el.innerHTML = tpl;
    return el.children[0];
}

function parse(text) {
    return '"' + text.replace(/\r?\n/g, '')
        // 边界符外的文本 " \ 转义
        .replace(/(^|}}).*?({{|$)/g, function($) {
            return $.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        })
        .replace(/{{(.*?)}}/g, '"+' + tryValue('$1', '""') + '+"') + '"';
}

function validate(code, node) {
    if (!code) return code;
    try {
        // !{} 防止对象当代码块解释
        var f = Function((code.match(/^\s*\{/) ? '!' : '') + code); // 语法检测
        return true;
    } catch (e) {
        console.log(f, code)
        debug && console.error('domTpl:', node.nodeValue || code, node, e);
    }
}

function tryValue(v1, v2) {
    // return 'function(){try{var v=' + v1 + ';return v===undefined?"":v}catch(e){return ' + v2 + '}}.call(this)';
    return '(' + v1 + ')'; // 'str'+ (++n) +'str'
    return v1;
}

function tryFn(fn, v2) {
    try {
        return fn()
    } catch (e) {
        return 1 in arguments ? v2 : ""
    }
}

function exp(value) {
    return 'function(){return ' + value + '}.call(_data_)'
}

function indent(n) {
    var l = indent.n || (indent.n = 1);
    indent.n += n || 0;
    return Array(n > 0 ? l : indent.n).join('  ');
}

function setMark(node, name) {
    var mark = node.mark;
    if (!mark) {
        mark = debug ? document.createComment(name + ':' + getNodeId(node)) : document.createTextNode(''); // todo ie
        node.parentNode.insertBefore(mark, node);
        node.mark = mark;
        mark.node = node;
        name == 'each' && remove(node);
    }
    return mark;
}

function remove(node) {
    var parentNode = node.parentNode;
    if (parentNode && parentNode.nodeType == 1) { // ie parentNode == documentFragment
        parentNode.removeChild(node);
    }
}

var autoFocusTimer;

function insert(node, mark) {
    var parentNode = node.parentNode;
    mark = mark || node.mark;
    if (!parentNode || parentNode.nodeType != 1) {
        mark.parentNode.insertBefore(node, mark);

        // 使动态插入的 aotofocus 生效
        // clearTimeout(autoFocusTimer);
        autoFocusTimer = setTimeout(function() {
            // console.log('insert', node);
            ! function loop(node) {
                if (null != node.getAttribute('autofocus')) {
                    node.focus();
                    // console.log('focus', node);
                    return true;
                }
                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    var has = loop(children[i]);
                    if (has) break;
                }
            }(node);
        }, 800);
    }
}


/**********************************************/
/*
if_(node(1), value, function(){

})
.elseif_(node(2), value, function(){

})
.else_(node(3), function(){

}
 */
function if_(node, bool, fn) {
    var mark = setMark(node, 'if');
    if (bool) {
        insert(node, mark);
        fn && fn();
    } else {
        remove(node);
    }
    return {
        bool: bool,
        elseif_: elseif_,
        else_: else_
    }
}

function elseif_(node, bool, fn) {
    var mark = setMark(node, 'elseif');
    if (this.bool) {
        remove(node);
    } else {
        if (bool) {
            insert(node, mark);
            fn && fn();
        } else {
            remove(node);
        }
    }
    return {
        bool: this.bool || bool, // *
        elseif_: elseif_,
        else_: else_
    }
}

function else_(node, fn) {
    var mark = setMark(node, 'else');
    if (this.bool) {
        remove(node);
    } else {
        fn && fn();
        insert(node, mark);
    }
}

function show(node, value) {
    node.style.display = value ? '' : 'none'
}

function html(node, value) {
    node.innerHTML = value
}

function text(node, value) {
    node.innerHTML = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function nodeValue(node, value) {
    node.nodeValue = typeof value == 'object' &&
        typeof JSON != 'undefined' && JSON.stringify ?
        JSON.stringify(value, 0, '    ') :
        value
}

function attr(node, name, value) {
    node.setAttribute(name, value)
}

function class_(node, map) {
    if (map.push) {
        var arr = map;
        var map = {};
        for (var i = 0; i < arr.length; i++) {
            map[arr[i]] = 1
        }
    }
    for (var name in map) {
        var className = node.className;
        if (map[name]) {
            if (!has(name))
                node.className += (className ? ' ' : '') + name
        } else {
            if (has(name))
                node.className = className.replace(RegExp('(^|\\s+)' + name + '(?=\\s+|$)', 'g'), '')
        }
    }

    function has(name) {
        return className.match(RegExp('(^|\\s+)' + name + '(\\s+|$)'))
    }
}


function style(node, map) {
    var style = node.style;
    for (var name in map) {
        var Name = name.replace(/(^|-)(.)/g, function($, $1, $2) {
            return $2.toUpperCase();
        });

        var v = map[name];
        isNaN(v) || (style['webkit' + Name] =
            style['moz' + Name] =
            style['ms' + Name] =
            style['o' + Name] =
            style[name] = v + 'px'
        );
        style['webkit' + Name] =
            style['moz' + Name] =
            style['ms' + Name] =
            style['o' + Name] =
            style[name] = v;
    }
}

// m->v
function m2v(node, model) {
    if (document.activeElement == node) return;

    // select checkbox 要等 :value 先设置
    _setTimeout(function() {
        var Value = node.Value !== undefined ? node.Value : node.value;

        if (node.type == 'checkbox') {
            node.checked = model && model.push ? //是否多选
                model.indexOf(Value) != -1 : model
        }
        // 
        else if (node.type == 'radio') {
            node.checked = model === Value
        }
        // 
        else if (node.nodeName == 'SELECT') {
            var options = node.options;
            var multiple = node.type == 'select-multiple';

            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var Value = option.Value !== undefined ? option.Value : option.value;
                option.selected = multiple ?
                    model.indexOf(Value) != -1 :
                    model === Value;

                if (!multiple && model === Value) break
            }
        }
        // 
        else {
            node.value = model;
        }

    }, 2);
}

// v->m
function v2m(node, obj, key, isTrim, isNumber) {
    var model = obj[key];
    var Value = 'Value' in node ? node.Value : node.value;
    isTrim && typeof Value == 'string' && (Value = Value.trim());
    isNumber && !isNaN(Value) && (Value = +Value);

    if (node.type == 'checkbox') {
        // 多选
        if (model && model.push) { // model绑定为数组
            var index = model.indexOf(Value)
            if (node.checked) {
                index == -1 && model.push(Value)
            } else {
                index != -1 && model.splice(index, 1)
            }
        }
        // 是否
        else {
            var checked = node.checked;
            var trueValue = node.trueValue || checked; // todo: trueValue
            var falseValue = node.falseValue || checked; // todo: falseValue
            obj[key] = checked ? trueValue : falseValue;
        }
    }
    // 
    else if (node.type == 'radio') {
        obj[key] = Value;
    }
    // 
    else if (node.nodeName == 'SELECT') {
        var options = node.options;
        var multiple = node.type == 'select-multiple';
        // 多选
        if (multiple) {
            model = model || (obj[key] = []);
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var Value = option.Value !== undefined ? option.Value : option.value;
                var index = model.indexOf(Value);
                if (option.selected) {
                    index == -1 && model.push(Value)
                } else {
                    index != -1 && model.splice(index, 1)
                }
            }
        } else
        // 单选
        {
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var Value = option.Value !== undefined ? option.Value : option.value;
                if (option.selected) {
                    obj[key] = Value;
                    break;
                }
            }
        }
    }
    // 
    else {
        obj[key] = Value;

    }

}

/**********************************************/

var eventMap = {
    // 'click':{'3.0': fn0, '3.1': fn1 }
};

var addListenner = function() {
    return document.addEventListener ? function(type, fn) {
        document.body.addEventListener(type, fn, 1); // 1 事件捕获， 因为 focus, blur 等事件不支持冒泡
    } : function(type, fn) {
        document.attachEvent('on' + type, function() {
            var event = window.event;
            event.target = srcElement;
            fn(event);
        });
    }
}();

function on(node, eventType, fn) {
    if (eventType == 'model') {
        on(node, 'input', fn);
        on(node, 'change', fn);
        return;
    }
    if (eventType == 'input' && !('oninput' in node)) {
        on(node, 'keyup', fn);
        return;
    }

    var nid = getNodeId(node);

    if (!eventMap[eventType]) {
        eventMap[eventType] = {};

        addListenner(eventType, function(e) {
            // console.log('eventHandler:', eventType);
            // e.target 往上递归
            // console.time('on:handler');
            (function loop(node) {
                if (!node) return;

                var nid = getNodeId(node);
                if (nid) {
                    var baseNid = String(nid).match(/.*?(?=\.|$)/)[0]; // 57.0.1 => 57
                    var fn = eventMap[eventType][baseNid];
                    if (fn) {
                        // 执行事件回调
                        fn(node, e);
                        // 并更新视图
                        setTimeout(function() { // 循环大时 firefox 比较卡
                            renderAll();
                        }, 41)
                    }
                }
                loop(node.parentNode);
            })(e.target);
            // console.timeEnd('on:handler');

        });
    }

    eventMap[eventType][nid] = fn;
}


/**********************************************/

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

    // node.nodeValue = nid + ': ' + node.nodeValue; // test
    debug && node.setAttribute && node.setAttribute('nid', nid); // test
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


/**
 * [each description]
 * @param  {nid}   nodeBaseId [description]
 * @param  {Array|Object|Number}   arr  [description]
 * @param  {Function} fn   [description]
 * @return {[type]}        [description]
 */
function each(nid, arr, fn) {
    arr = arr || [];
    var node = getNode(nid);
    var mark = setMark(node, 'each');
    var eachII = each.ii; //**

    var isObj = {}.toString.call(arr) == "[object Object]";
    var keys = Object.keys(arr);
    var isNumber = typeof arr == 'number';

    var length = isObj ? keys.length : (isNumber ? arr : arr.length);
    for (var i = 0; i < length; i++) {
        each.ii = eachII + '.' + i; //** full nid eg: 3.3.4
        // 获取或克隆并插入
        var _node = getNode(nid) || cloneNode(node, i); // **
        _node.mark || insert(_node, mark); // _node.mark 有if由if来处理

        var key = isObj ? keys[i] : i;
        var item = isNumber ? i : arr[key];
        fn.apply(arr, [item, key, i, arr]);
    }

    // 移除
    var lastLength = node.lastLength || 0;
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

/**********************************************/
/*
 {obj:{a:1,b:2}, v:item}
 =>
 var obj={a:1,b:2}, v=item
 */
function var_(str) {
    str = str.replace(/^\s*\{/, 'var ');
    str = str.replace(/\}\s*$/, '');
    var q = 0; // { number
    var code = '';
    for (var i = 0; i < str.length; i++) {
        var char = str.charAt(i);
        if (char == '{') q++;
        if (char == '}') q--;
        if (char == ':' && !q) char = '=';
        code += char
    }
    return code
    return 'try{' + code + '}catch(e){}'
}

function include(node, tpl) {
    node.innerHTML = tpl
}

/**********************************************/

function compile(node) {
    node = node || document.body.parentNode;

    var code = ''; // render
    var onceCode = '';
    var scopeCode = 'var _reg_ = /\\.(.*?)(?=\\.|$)/g;\nvar $list=[],$index,$value,$key\n'; // on // todo: -- _reg_
    (function scan(node) {

        if (node.nodeType == 1 && !node.nid) { // 防止重复
            var nid;

            // each start: each 最优先，其它指令归为克隆节点
            var eachStr = getAttr(node, 'each');
            if (eachStr) {
                var m = eachStr.match(/(\((.+?)(,(.+?))?(,(.+?))?\)|(.+))\s+(in|of)\s+(.+)/); // (value,key,index) in obj | value in obj
                var nid = nid || setNodeId(node);

                var value = m[2] || m[7] || '$value';
                var key = m[4] || '$key';
                var index = m[6] || '$index';
                var obj = m[9] || '$obj';

                code += indent(+1) +
                    '_$$.each(@nid, @obj, function(@value,@key,@index){\n'
                    .replace('@nid', nid)
                    .replace('@obj', obj)
                    .replace('@value', value)
                    .replace('@key', key)
                    .replace('@index', index);

                var _scopeCode = scopeCode;
                scopeCode = _scopeCode + getVars(obj) + (
                        '\n//------@index\n' //
                        + 'var $list = @list\n' //  todo: -- $list
                        + 'var @index = _reg_.exec($this.nid)[1]\n' //
                        + 'var @key = {}.toString.call(@list)=="[object Array]"?@index:Object.keys(@list)[@index]\n' // todo: obj key
                        + 'var @value = (@list)[@index]\n' //
                        + '\n'
                    )
                    .replace(/@list/g, obj)
                    .replace(/@index/g, index)
                    .replace('@key', key)
                    .replace('@value', value);

                scanChildren();

                scopeCode = _scopeCode; // pop
                // code += indent(-1) + '})\n'; // to: each end
            }

            // if
            var ifStr = getAttr(node, 'if');
            if (validate(ifStr, node)) {
                var nid = nid || setNodeId(node);
                code += indent(+1) +
                    '_$$.if_(_$$.node(nid), value, function(){\n'
                    .replace('nid', nid)
                    .replace('value', tryValue(ifStr, '0'));
                scanChildren();
                code += indent(-1) +
                    '})\n';
            }
            // elseif
            var elseifStr = getAttr(node, 'elseif');
            if (validate(elseifStr, node)) {
                var nid = nid || setNodeId(node);
                code += indent(+1) +
                    '.elseif_(_$$.node(nid), value, function(){\n'
                    .replace('nid', nid)
                    .replace('value', tryValue(elseifStr, '0'));
                scanChildren();
                code += indent(-1) +
                    '})\n';
            }
            // else
            var elseStr = getAttr(node, 'else');
            if (elseStr !== null) {
                var nid = nid || setNodeId(node);
                code += indent(+1) +
                    '.else_(_$$.node(nid), function(){\n'
                    .replace('nid', nid);
                scanChildren();
                code += indent(-1) +
                    '})\n';
            }


            // each end
            if (eachStr) {
                code += indent(-1) + '})\n';
            }
            // if (!eachStr && !ifStr) 
            scanChildren();

            var hasScanChildren = false; // each if 只能 scanChildren 一次
            function scanChildren() {
                if (hasScanChildren) return;
                hasScanChildren = true;

                var attributes = toArray(node.attributes);
                for (var i = 0; i < attributes.length; i++) {
                    var attribute = attributes[i];
                    if (!attributes[i].specified) continue; // for ie
                    scanAttr(node, attribute)
                }

                var childNodes = toArray(node.childNodes);
                for (var i = 0; i < childNodes.length; i++) {
                    scan(childNodes[i]);
                }

            }
        } else if (node.nodeType == 2) {
            scanText(node)
        } else if (node.nodeType == 3) {
            scanText(node)
        }

    })(node);

    code = '' //
        + '_data_=_data_||{}\n' // 
        + getVars(code) + '\n\n' //
        + 'var _$$ = arguments.callee\n' // 
        + code;
    var render = Function('_data_', code);
    for (var dir in dirs) {
        ! function() {
            var fn = dirs[dir];
            render[dir] = function(node, args, value) {
                var args = {
                    node: node,
                    args: args,
                    value: value
                };
                fn(args)
            }
        }();
    }
    render.node = getNode;
    render.each = each;
    render.if_ = if_;
    render.nodeValue = nodeValue;
    render.class_ = class_;
    render.style = style;
    render.value = m2v;
    render.on = on;
    render.dir = dir;

    var once = Function('_data_',
        'var _$$ = arguments.callee\n' +
        onceCode
    );
    once.node = getNode;
    once.on = on;
    once.v2m = v2m;
    render.once = once;

    debug && console.log(once);
    debug && console.log(render);
    return render;

    function scanText(node) {
        var nodeValue = String(node.nodeValue);
        // {{}}
        if (nodeValue.match('{{')) {
            var value = parse(nodeValue);
            if (validate(value, node)) {
                var nid = setNodeId(node);
                code += '\n';
                code += indent() + '/*' + node.nodeValue.replace(/\s+/g, ' ') + '*/\n'; // test
                code += indent() +
                    '_$$.nodeValue(_$$.node($nid), $value)'
                    .replace('$nid', nid)
                    .replace('$value', exp(value));
                code += '\n';
            }
        }
    }

    function scanAttr(node, attribute) {
        var dir = getDir(attribute);

        // 简写
        // :value => attr:value
        if (dir.name == '') {
            dir.isDir = true;
            dir.name = 'attr';
        }

        if (dir.isDir) {
            getAttr(node, dir.attr);
            var nid = setNodeId(node);
            code += '\n';
            if (debug) code += indent() + '/*' + node.cloneNode().outerHTML + '*/\n'; // test

            switch (dir.name) {
                case 'each':
                    break;
                case 'if':
                    break;
                case 'elseif':
                    break;
                case 'else':
                    break;
                case 'on':
                    var eventCode = '\n//---\n_$$.on(_$$.node(@nid), "@eventType", function($this,$event){!function(){@prevent\n@keyCode\n@vars\n@scopeCode\n@code\n}.call(_data_)})\n'
                        .replace('@nid', nid)
                        .replace('@eventType', dir.args[1])
                        .replace('@prevent', dir.attr.match('.prevent') ? '$event.preventDefault()' : '')
                        .replace('@keyCode', function() {
                            var s = '';
                            var m = dir.attr.match(/\.(\d+)/);
                            s += m ? 'if($event.keyCode!=' + m[1] + ')return;' : '';
                            s += dir.attr.match('.ctrl') ? 'if(!$event.ctrlKey)return;' : '';
                            s += dir.attr.match('.shift') ? 'if(!$event.shiftKey)return;' : '';
                            s += dir.attr.match('.alt') ? 'if(!$event.altKey)return;' : '';
                            s += dir.attr.match('.meta') ? 'if(!$event.metaKey)return;' : ''; // firefox 貌似不支持
                            return s
                        })
                        .replace('@vars', getVars(dir.value, '$this,$event'))
                        .replace('@scopeCode', scopeCode)
                        .replace('@code',
                            dir.value.match(/^\s*[$_\w]+\s*$/) ?
                            dir.value + '($event)' : // on:click="handler" => handler($event)
                            dir.value
                        );
                    onceCode += eventCode;
                    // console.log('on:', Function(eventCode))
                    break;
                case 'model':
                    // m->v
                    code += indent() + '_$$.value(_$$.node($nid), $value)'
                        .replace('$nid', nid)
                        .replace('$value', dir.value)
                    code += '\n';

                    // v->m
                    var model = dir.value;
                    var okm = model.match(/(.+)\.(.+)|(.+)\[(.+)\]/); // obj.key || obj["key"]
                    if (okm) {
                        var obj = okm[1] || okm[3];
                        var key = okm[2] ? '"' + okm[2] + '"' : okm[4];
                    } else {
                        // each item in list
                        // 1: model="item"
                        // 2: model="other"
                        var obj = '$list[$index]===$model? $list:_data_'.replace('$model', model);
                        var key = '$list[$index]===$model? $index:"$model"'.replace(/\$model/g, model);
                    }
                    var eventCode = '\n_$$.on(_$$.node(@nid), "model", function($this,$event){\n@vars\n@scopeCode\n;_$$.v2m($this,@obj,@key,@isTrim,@isNumber)})'
                        .replace('@nid', nid)
                        .replace('@obj', obj)
                        .replace('@key', key)
                        .replace('@isTrim', !!dir.attr.match('.trim'))
                        .replace('@isNumber', !!dir.attr.match('.number'))
                        .replace('@vars', getVars(dir.value))
                        .replace('@scopeCode', scopeCode);
                    onceCode += eventCode;
                    // console.log(Function(eventCode));

                    break;
                case 'var':
                    code += indent() + var_(dir.value);
                    code += '\n';
                    break;
                default:
                    code += indent() + '_$$["$dir"](_$$.node($nid), ["$args"], $value)'
                        .replace('$dir', dir.name)
                        .replace('$nid', nid)
                        .replace('$args', dir.args.join('","'))
                        .replace('$value', exp(dir.value));
                    code += '\n';
            }
        }
    }

}

/**********************************************/

var dirs = {
    'each': 1,
    'if': 1,
    'elseif': 1,
    'else': 1,
    'on': 1,
    'model': 1,
    'var': 1,
    'include': 1,
};

function isDir(attribute) {
    var attr = attribute.name || attribute;
    var dirArgs = attr.split(/:|\./);
    var name = dirArgs[0];
    if (name in dirs) {
        debug || attribute.ownerElement && attribute.ownerElement.removeAttribute(attr);
        return true
    }
}

/**
 * on:click.13.prevent="alert()"
 * =>
 * {
 *     name:'on',
 *     value:'alert()',
 *     args:['on:click.13.prevent', 'on', 'click', '13', 'prevent']
 * }
 * 
 * @param  {String|Attribute} attribute [description]
 * @return {Array}      [description]
 */
function getDir(attribute) {
    var attr = attribute.name || attribute;
    var dirArgs = attr.split(/:|\./);
    var name = dirArgs[0];
    var dir = {
        attr: attr,
        value: attribute.value,
        name: name,
        args: dirArgs
    }
    if (name in dirs) {
        dir.isDir = true
    }
    return dir
}

function directive(name, fn) {
    dirs[name] = fn
}

/*
{{}} text html attr class style on model var include if each
*/
directive('text', function(options) {
    if (options.node.innerHTML != options.value) {
        text(options.node, options.value)
    }
})
directive('html', function(options) {
    if (options.node.innerHTML != options.value) {
        html(options.node, options.value)
    }
})
directive('attr', function(options) {
    var node = options.node;
    var value = options.value;
    var name = options.args[1];

    if (name == 'value') {
        node.Value = value; // Value: option:value="obj" => option.Value=obj
        if (document.activeElement == node) return; //
        node.value = value;
    } else if (name == 'class') {
        class_(node, value)
    } else if (name == 'style') {
        style(node, value)
    } else {
        if (!(name in node)) {
            for (var _name in node) {
                if (name == _name.toLowerCase()) { // :contenteditable => node.contentEditable
                    name = _name;
                    break
                }
            }
        }
        node[name] = value
    }
})
directive('show', function(options) {
    show(options.node, options.value)
})

/**********************************************/

var vms = [];

function renderAll() {
    for (var i = 0; i < vms.length; i++) {
        vms[i].render()
    }
}

document.addEventListener('DOMContentLoaded', renderAll);
document.addEventListener('load', renderAll);
document.addEventListener('error', renderAll);

var _Image = Image;
window.Image = function(w, h) {
    var img = new _Image(w, h);
    _setTimeout(function() {
        var onload = img.onload;
        var onerror = img.onerror;
        if (onload) {
            img.onload = function() {
                _onload.apply(img, arguments);
                renderAll();
            }
        }
        if (onerror) {
            img.onerror = function() {
                onerror.apply(img, arguments);
                renderAll();
            }
        }
    }, 1)
    return img
}

var _setTimeout = setTimeout;
// window.setTimeout = function(fn, time) {
//     return _setTimeout(function() {
//         typeof fn == 'function' ? fn() : eval(fn);
//         renderAll();
//     }, time);
// }

var _setInterval = setInterval;
var intervalRenderAll = lazy(renderAll, 115);
// window.setInterval = function(fn, time) {
//     return _setInterval(function() {
//         typeof fn == 'function' ? fn() : eval(fn);
//         intervalRenderAll();
//     }, time);
// }

// devOpen
false && function() {
    function ondevopen() {
        ondevopen.open || _setInterval(renderAll, 500);
        ondevopen.open = true;
    }

    if (window.outerWidth - window.innerWidth > 200 ||
        window.outerHeight - window.innerHeight > 200) {
        ondevopen()
    }
    addListenner('keyup', function(e) {
        if (e.keyCode == 123) {
            ondevopen()
        }
    });

    var el = new Image;
    Object.defineProperty(el, 'id', {
        get: function() {
            ondevopen()
        }
    });
    console.log('%c', el);
}();


// ajax

/**********************************************/

function replaceFunction(data) {
    for (var name in data) {
        (function() { // closure for fn 
            var fn = data[name];
            if (typeof fn == 'function') {
                data[name] = function() {
                    fn.apply(data, arguments);
                    renderAll();
                };
                data[name].fn = fn;
            }
        })();
    }
}

function lazy(fn, time) {
    var t, lastDate = 0;
    return function() {
        var now = new Date;
        if (now - time > lastDate) {
            fn();
            lastDate = now;
        } else {
            clearTimeout(t);
            t = _setTimeout(fn, time)
        }
    }
}

// function lazy(fn, time) {
//     time = time || 41;
//     var t;
//     var runing = false;
//     var args;
//     return function() {
//         args = arguments;
//         if (runing) return;

//         var self = this;

//         runing = true;
//         t = _setTimeout(function() {
//             fn.apply(self, args);
//             runing = false;
//         }, time);
//     }
// };

/**********************************************/

function V(data, node) {
    data = data || {};
    node = node || data.$el || document.body.parentNode;
    replaceFunction(data);

    var render = compile(node);
    render.data = data;
    data.$el = node;

    var lazyRender = lazy(function() {
        // console.error('render: ', new Date().getTime());
        // console.time('render');
        render(data);
        // console.timeEnd('render');
    }, 99);

    data.render = function(_data) {
        replaceFunction(_data);
        for (var key in _data) {
            data[key] = _data[key];
        }
        // render(data);
        lazyRender();
    };
    data.render.fn = render;

    vms.push(data);

    data.render();
    setTimeout(function() {
        render.once(data);
    }, 41);
    // window.render = data.render;

    if (typeof Proxy != 'undefined') {
        var proxy = new Proxy(data, {
            set: function(data, name, value) {
                console.error('set', name)
                data[name] = value;
                data.render();
            },
            get: function(data, name) {
                if (name != 'toJSON' && name != '$data') { // tpl:  JSON.stringify(vm)
                    console.error('get', name)
                    setTimeout(function() { // vm.list.length = 3
                        data.render();
                    }, 1)
                }
                return data[name];
            }
        });
        proxy.toJSON = function() { // tpl:  JSON.stringify(vm)
            var _data = extend({}, data);
            delete _data.$data; // circular
            return _data;
        };
        proxy.$data = data;
        return proxy;
    }

    return data
}
