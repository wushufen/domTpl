var doc = document;
var html = doc.getElementsByTagName('html')[0];
var head = doc.getElementsByTagName('head')[0];
var vdom = {};

var WU = {};

function observe(objName) {
    var value = {};
    Object.defineProperty(WU, objName, {
        get: function() {
            console.log('get', value);
            return value;
        },
        set: function(v) {
            value = v;
            console.log('set', value);
        }
    })
}




/**
 * array-like to array
 * @return {Array} 
 */
var toArray = function() {
    try {
        [].slice.call(document.childNodes); // ie xx
        return function(arrayLike) {
            return [].slice.call(arrayLike);
        }
    } catch (e) {
        return function(arrayLike) {
            var arr = [];
            for (var i = 0; i < arrayLike.length; i++) {
                arr.push(arrayLike[i]);
            };
            return arr;
        }
    }
}();


/**
 * simple uuid creater
 * @return {Number}          uuid
 */
var UUID = function() {
    var id = 0;
    return function() {
        return ++id;
    }
}();


/**
 * scan document
 *
 * vdom = {
 *  uuid: {
 *      dom: node,
 *      nodeType: 0,
 *      text: string,
 *      directive: []
 *  }
 * }
 * 
 * @param  {Node} node 
 */
function scan(node) {
    node = node || html;

    // 属性，文本，注释 节点
    if (node.nodeType == 2 || node.nodeType == 3 || node.nodeType == 8) {

        // ie 低版本标签即使没有写某属性，也会在 tag.attributes 中
        // ie8 下不支持 attr.nodeValue
        // ie7 attr 下会奇怪地出现 true 的情况。如 [spellcheck], 所以要转成字符串
        var text = (node.nodeValue || node.value || '') + '';

        // 不含表达式则不处理
        if (!text.match('{{')) {
            return
        }

        // 保存
        var uuid = UUID();
        vdom[uuid] = {
            uuid: uuid,
            node: node,
            nodeType: node.nodeType,
            text: text
        };
    }
    // 标签 节点
    else if (node.nodeType == 1) {

        // 指令
        var wu = node.getAttribute('wu');
        if (wu) {
            var uuid = UUID();
            vdom[uuid] = {
                uuid: uuid,
                node: node,
                nodeType: node.nodeType,
                directive: wu
            }
        }

        // 属性
        // 转成数组，避免增删节点时下标偏差
        var attributes = toArray(node.attributes);
        for (var i = 0; i < attributes.length; i++) {
            if (attributes[i].specified) {
                scan(attributes[i]);
            };
        };
        // 子节点
        var childNodes = toArray(node.childNodes);
        for (var i = 0; i < childNodes.length; i++) {
            scan(childNodes[i]);
        };
    }

}


/**
 * [directive description]
 * @param  {[type]}   d  [description]
 * @param  {Function} fn [description]
 * @return {[type]}      [description]
 */
function directive(d, fn) {

}

directive('if', function (options) {
    var exp = options.text;
    var bool = calc(exp);
    if (bool) {

    }else{

    }
});


/**
 * calc exp
 *
 * '1+2'
 * =>
 * 3
 * 
 * @param  {String} exp 
 * @return {String}     result
 */
function calc(exp, scope) {
    var result = '';
    try {
        result = eval('(' + exp + ')');
    } catch (e) {
        console.log('calc error:', exp, scope);
    }
    return result;
}


/**
 * [renderString description]
 *
 * 'string {{ 1+2 }} string'
 * =>
 * 'string 3 string'
 * 
 * @param  {String} string [description]
 * @return {String}        [description]
 */
function renderString(string) {
    var newString = string;
    var reg = /{{([\s\S]*?)}}/gm; //{{(exp)}}
    var m;
    while ((m = reg.exec(string)) !== null) {
        newString = newString.replace(m[0], calc(m[1]));
    }
    return newString;
}


/**
 * render dom
 */
function renderDom() {
    for (var i in vdom) {
        var item = vdom[i];
        var node = item.node;
        // 属性，文本，注释 节点
        if (item.nodeType != 1) {
            var text = item.text;
            var text1 = item.text1;
            var text2 = renderString(text);
            if (text2 !== text1) {
                item.text1 = text2;
                // console.log('render', node)
                if (node.nodeType == 2) {
                    node.value = text2;
                };
                if (node.nodeType == 3 || node.nodeType == 8) {
                    node.nodeValue = text2;
                };
            }
        }
        // 标签 节点
        else {

        }
    }
}


onload = function() {
    var d1 = new Date;
    scan();
    renderDom()
    document.title = new Date - d1;
    // console.table(vdom)
};
