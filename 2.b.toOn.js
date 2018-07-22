var debug = true;
// var debug = false;

/**********************************************/

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
    var arr = code.replace(/\s*\.\s*/, '.') // obj . key  => obj.key
        .replace(/'[^\']*'|"[^\"]*"|\.[$\w]*|\/\*.*?\*\/|\/\/.*?\n/g, '') // 'xxx'  "xxx"  obj.xxx  /*xxx*/ //xxx
        // todo: $this 也被删了。。
        .replace(/\b(if|else|switch|case|default|for|continue|do|while|break|function|arguments|return|new|class|this|instanceof|try|catch|finally|throw|typeof|in|delete|var|true|false|undefined|null|void|with|window)\b/g, '')
        // .match(/[$a-z_A-Z][$\w]*/g);
        .match(/[$a-z_A-Z\u4E00-\u9FA5][$\w\u4E00-\u9FA5]*/g) || []; // 允许中文变量
    var vars = '';
    var map = {};
    for (var i = 0; i < arr.length; i++) {
        var name = arr[i];
        if (!map[name]) {
            vars +=
                // var name =
                'var ' + name + '=' +
                // name ||
                name + '||' +
                // ("name" in _data_? _data_.name: window.name)
                '("' + name + '" in _data_?_data_.' + name + ':window.' + name + ')' +
                // || ""
                // '||"---"' +
                // ;
                ';';

            map[name] = 1;
        }
    }

    console.log(map)
    return vars;
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

function exp(fn, v2) {
    try {
        var v = fn();
        return v === undefined ? "" : v
    } catch (e) {
        return 1 in arguments ? v2 : ""
    }
}

function indent(n) {
    var l = indent.n || (indent.n = 1);
    indent.n += n || 0;
    return Array(n > 0 ? l : indent.n).join('  ');
}

function setMark(node, name) {
    var mark = node.mark;
    if (!mark) {
        mark = debug ? document.createComment(name) : document.createTextNode(''); // todo ie
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

function insert(node, mark) {
    var parentNode = node.parentNode;
    mark = mark || node.mark;
    if (!parentNode || parentNode.nodeType != 1) {
        mark.parentNode.insertBefore(node, mark)
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

        style['webkit' + Name] =
            style['moz' + Name] =
            style['ms' + Name] =
            style['o' + Name] =
            style[name] = map[name];

        style['webkit' + Name] =
            style['moz' + Name] =
            style['ms' + Name] =
            style['o' + Name] =
            style[name] = map[name] + 'px';

    }
}

function value(node, value) {

    // select checkbox 要等 :value 先设置
    _setTimeout(function() {

        if (node.type == 'checkbox') {
            var _value = node.Value !== undefined ? node.Value : node.value;
            node.checked = value && value.push ? //是否多选
                value.indexOf(_value) != -1 : value
        }
        // 
        else if (node.type == 'radio') {
            node.checked = value
        }
        // 
        else if (node.nodeName == 'SELECT') {
            var options = node.options;
            var multiple = node.type == 'select-multiple';

            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var _value = option.Value !== undefined ? option.Value : option.value;
                option.selected = multiple ?
                    value.indexOf(_value) != -1 :
                    value === _value;

                if (!multiple && value === _value) break
            }
        }
        // 
        else {
            node.value = value
        }

    }, 2);
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
    var nid = getNodeId(node);

    if (!eventMap[eventType]) {
        eventMap[eventType] = {};

        addListenner(eventType, function(e) {
            // e.target 往上递归
            (function loop(node) {
                if (!node) return;

                var nid = getNodeId(node);
                var fn = eventMap[eventType][nid];
                if (fn) {
                    // 执行事件回调
                    fn(node, e);
                    // 并更新视图
                    renderAll();
                }
                loop(node.parentNode);
            })(e.target);

        });
    }

    // eventMap[eventType][nid] || (eventMap[eventType][nid]=fn)
    // 必须每次替换 fn，之前的 fn 保持前一状态的 scpoe，使用到变量不会跟着变
    eventMap[eventType][nid] = fn;
}

function model(node, obj, key) {
    // console.log(node, node.value)
    // console.log(obj, key)
    var data = obj[key];
    var Value = node.Value || node.value;

    // 复选框
    if (node.type == 'checkbox') {
        // v->d
        on(node, 'click', function() {
            // 多选
            if (data && data.push) { // model绑定为数组
                var index = data.indexOf(Value)
                if (node.checked) {
                    index == -1 && data.push(Value)
                } else {
                    data.splice(index, 1)
                }
            }
            // 是否
            else {
                var checked = node.checked;
                var trueValue = node.trueValue || checked; // trueValue
                var falseValue = node.falseValue || checked; // falseValue
                obj[key] = checked ? trueValue : falseValue;
            }
        });
        // d->v
        node.checked = data && data.push ?
            data.indexOf(Value) != -1 :
            data;
    } else
    // 单选钮
    if (node.type == 'radio') {
        // v->d
        on(node, 'click', function() {
            obj[key] = Value;
        });
        // d->v
        node.checked = data === Value;
    } else
    // select
    if (node.nodeName == 'SELECT') {
        var options = node.options;
        var multiple = node.type == 'select-multiple';
        // v->d
        on(node, 'change', function() {
            // 多选
            if (multiple) {
                data = data || (obj[key] = []);
                for (var i = 0; i < options.length; i++) {
                    var option = options[i];
                    var Value = option.Value || option.value;
                    var index = data.indexOf(Value);
                    if (option.selected) {
                        index == -1 && data.push(Value)
                    } else {
                        index != -1 && data.splice(index, 1)
                    }
                }
            } else
            // 单选
            {
                for (var i = 0; i < options.length; i++) {
                    var option = options[i];
                    var Value = option.Value || option.value;
                    if (option.selected) {
                        obj[key] = Value;
                        break;
                    }
                }
            }
        });
        // d->v
        if (multiple) {

            // 避免被冲掉
            if (document.activeElement == node) {
                return
            }

            data = data || (obj[key] = []);
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var Value = option.Value || option.value;
                var index = data.indexOf(Value);
                option.selected = index != -1
            }
        } else {
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                var Value = option.Value || option.value;
                if (obj[key] == Value) {
                    option.selected = true
                    break;
                }
            }
        }
    } else
    // 文本框 等
    {
        // v->d
        // on(node, 'model', handler);
        on(node, 'input', handler);
        on(node, 'keyup', handler);
        on(node, 'change', handler);

        function handler() {
            var Value = node.Value || node.value; // 输入须重取当前值，不能用外部闭包
            obj[key] = Value
        }


        // 避免被冲掉
        if (document.activeElement == node) {
            return
        }
        // d->v
        if (data === undefined) data = '';
        node.value = data;
    }

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
 * @param  {Node}   node [description]
 * @param  {Array|Object|Number}   arr  [description]
 * @param  {Function} fn   [description]
 * @return {[type]}        [description]
 */
function each(node, arr, fn) {
    arr = arr || [];
    var nid = getNodeId(node);
    var mark = setMark(node, 'each');
    var eachII = each.ii; //**

    var isObj = {}.toString.call(arr) == "[object Object]";
    var keys = Object.keys(arr);
    var isNumber = typeof arr == 'number';

    var length = isObj ? keys.length : (isNumber ? arr : arr.length);
    for (var i = 0; i < length; i++) {
        each.ii = eachII + '.' + i; //** full nid eg: 3.3.4
        // get or clone node insert
        var _node = getNode(nid) || cloneNode(node, i); // **
        insert(_node, _node.mark || mark); // _node.mark if的位置优先

        var key = isObj ? keys[i] : i;
        var item = isNumber ? i : arr[key];
        fn.apply(arr, [item, i, item, key]);
    }

    // remove
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
    return 'try{' + code + '}catch(e){}'
}

function include(node, tpl) {
    node.innerHTML = tpl
}

/**********************************************/

function compile(node) {
    node = node || document.body.parentNode;

    var code = '';
    (function scan(node) {

        if (node.nodeType == 1 && !node.nid) { // 防止重复
            var nid;

            // each start: each 最优先，其它指令归为克隆节点
            var eachStr = getAttr(node, 'each');
            if (eachStr) {
                var nid = nid || setNodeId(node);
                var item_list = eachStr.split(' in ');
                code += indent(+1) +
                    '_$$.each(_$$.node(nid), list, function($item,$index,$value,$key){\n'
                    .replace('nid', nid)
                    .replace('list', tryValue(item_list[1], '[]'))
                    .replace('$item', item_list[0]);
                scanChildren();
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
    render.value = value;
    render.on = on;
    render.model = model;
    render.dir = dir;


    debug && console.log(render);
    return render;

    function scanText(node) {
        var nodeValue = String(node.nodeValue);
        // {{}}
        if (nodeValue.match('{{')) {
            var exp = parse(nodeValue);
            if (validate(exp, node)) {
                var nid = setNodeId(node);
                code += '\n';
                code += indent() + '/*' + node.nodeValue.replace(/\s+/g, ' ') + '*/\n'; // test
                code += indent() +
                    '_$$.nodeValue(_$$.node($nid), $value)'
                    .replace('$nid', nid)
                    .replace('$value', exp);
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
                    code += indent() + '_$$.on(_$$.node(nid), "event", function($this,$event){!function(){code}.call(_data_)})'
                        .replace('nid', nid)
                        .replace('event', dir.args[1])
                        .replace('code', dir.value);
                    code += '\n';
                    break;
                case 'on':
                    break;
                case 'modelx':
                    var model = dir.value;
                    var okm = model.match(/(.+)\.(.+)$/); // obj.key
                    if (okm) {
                        var obj = okm[1];
                        var key = '"' + okm[2] + '"';
                    } else {
                        // each item in list
                        // 1: model="item"
                        // 2: model="other"
                        var obj = 'this[$index]===model? this:_data_'.replace('model', model); // 在 each 中 this 是 array
                        var key = 'this[$index]===model? $index:"model"'.replace(/model/g, model);
                    }
                    code += indent() + '_$$.model(_$$.node(nid), obj, key)'
                        .replace('nid', nid)
                        .replace('obj', obj)
                        .replace('key', key)
                    code += '\n';

                    break;
                case 'model':
                    code += indent() + '_$$.value(_$$.node($nid), $value)'
                        .replace('$nid', nid)
                        .replace('$value', dir.value)
                    code += '\n';

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
                        .replace('$value', dir.value);
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
        debug || attribute.ownerElement && attribute.ownerElement.removeAttribute(attr);
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
        // :value="obj"
        node.Value = value
            // 避免影响当前输入
        if (document.activeElement != node) {
            node.value = value;
        }
    } else if (name == 'class') {
        class_(node, value)
    } else if (name == 'style') {
        style(node, value)
    } else {
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

var domReadyRender = function() {
    _setTimeout(renderAll, 300)
};
document.addEventListener('DOMContentLoaded', domReadyRender);
document.addEventListener('load', domReadyRender);
document.addEventListener('error', domReadyRender);

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
    replaceFunction(data);

    var render = compile(node);
    render.data = data;

    var lazyRender = lazy(function() {
        // console.error('render: ', new Date().getTime());
        render(render.data);
    }, 100);

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

    try { //避免模板使用了vm，若先执行则还没反回 vm undefined 报错
        data.render();
    } catch (e) {
        console.error(e)
    }
    // window.render = data.render;
    return data;
}
