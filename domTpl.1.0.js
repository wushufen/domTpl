/**
 * https://github.com/wusfen/domTpl
 */
(function(global) {
    'use strict';

    /**
     * ArrayLike to Array
     * @param {ArrayLike} arrayLike
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

    // fix
    function noop() {}
    if (!window.console) {
        console = {
            log: noop,
            warn: noop,
            info: noop,
            table: noop
        }
    }

    if (!Object.keys) {
        Object.keys = function(obj) {
            var arr = [];
            for (var key in obj) {
                if (!obj.hasOwnProperty(key)) continue;
                arr.push(key);
            }
            return arr;
        }
    }

    /*
    uidMap = {
        'baseUid>index': {
            uid: '10010>0',
            node: node,
            text: node.value || node.nodeValue || node.cloneNode().outerHTML,
        },

        11: {
            uid: 11,
            node: node,
            text: text,
            isFor: true,
        },

        '11>0': {
            uid: '11>0',
            node: cloneNode,
        },

        '11>1': {
            uid: '11>1',
            node: cloneNode,
        }
    }

    */
    var uidMap = {};
    window.uidMap = uidMap; // test
    var uid = 0;

    var canSetUidOnNode = function() {
        try {
            // ie 低版本不支持给 textNode attrNode 设置不存在的属性
            document.createTextNode('').uid = 1;
            return true;
        } catch (e) {}
    }();

    /**
     * set node uid
     *
     * @example setNodeUid(node, 100, 1) //=> '100[1]'
     * @example setNodeUid(node) //=> uid
     *
     * @param {Node} node
     * @param {Number|String} baseUid
     * @param {Number|Array} index
     */
    function setNodeUid(node, baseUid, index) {
        if (!getNodeUid(node)) {
            var _uid;
            if (!baseUid) {
                _uid = ++uid;
            } else {
                index = index.pop ? index : [index];
                _uid = baseUid;
                for (var i = 0; i < index.length; i++) {
                    // _uid += '[' + index[i] + ']';
                    _uid += '.' + index[i];
                }
            }
            uidMap[_uid] = {
                uid: _uid,
                // text: node.value || node.nodeValue || node.outerHTML,
                // nodeType: node.nodeType,
                node: node
            };
            if (canSetUidOnNode) {
                node.uid = _uid;
            }
            // todo 可以考虑保存到 node.nodeValue，因为只有 cloneNode 才须 getNodeUid
            // 而且 cloneNode 的原节点不会显示
            else {
                // node.nodeValue = _uid;
            }

            node.setAttribute && node.setAttribute('uid', _uid); // test
            node.parentNode && node.parentNode.insertBefore(document.createComment('uid:' + _uid), node); // test
        }
        return _uid;
    }

    /**
     * get node uid
     * @param  {Node} node
     * @return {String}
     */
    function getNodeUid(node) {
        if (canSetUidOnNode) {
            return node.uid
        } else {
            for (var uid in uidMap) {
                if (node == uidMap[uid].node) {
                    return uid;
                }
            }
        }
    }

    /**
     * get uid by uid of clone and EACH index
     *
     * @param {Number|String} baseUid
     * @param {Array} arr
     */
    function U(baseUid, arr) {
        arr = arr || [];
        var _uid = baseUid;
        for (var i = 0; i < arr.length; i++) {
            // _uid += '[' + arr[i] + ']';
            _uid += '.' + arr[i];
        }
        return _uid;
    }

    /**
     * @example
     *
     * {a:1, b:2}
     *
     * =>
     *
     * `
     * var a = _data_['a']
     * var b = _data_['b']
     * `
     *
     * @param  {Object} data
     * @return {String}
     */
    function dataToVars(data) {
        var varArr = Object.keys(data || {}).sort();
        var vars = ''; // 把传来的data转成内部变量，不用with，提高性能
        while (varArr.length) {
            var v = varArr.shift();
            vars += 'var ' + v + '=_data_["' + v + '"]\n';
        }
        return vars;
    }

    /**
     * compile dom to a render function
     *

    <div data="vm">

        {{a}}+{{b}}={{a+b}}

        <a href="{{href}}">{{href}}</a>

        <ul>
            <li for="item of list">
                {{index}}: {{item}}

                <span if="item > 10"> 10+ </span>

                <ul>
                    <li for="item2 of item">
                        {{item2}}
                    </li>
                </ul>
            </li>
        </ul>

        <div if="bool">
            {{bool}}
        </div>
    </div>

    =>

    function render() {

        V(U(1), "   " + (a) + "+" + (b) + "=" + (a + b) + " ")
        V(U(2), "" + (href) + "")
        V(U(3), "" + (href) + "")

        EACH(U(4), list, function(item, index, $i_4) {

            V(U(5, [$i_4]), "           " + (item) + "          ")

            IF(U(6, [$i_4]), item > 10, function() {})

            EACH(U(7, [$i_4]), item, function(item2, index, $i_7) {
                V(U(8, [$i_4, $i_7]), "                   " + (item2) + "             ")
            })
        })

        IF(U(9), bool, function() {
            V(U(10), "      " + (bool) + "  ")
        })

    }

    function render(a) {

        V(U(1), function(){return "   " + (a) + "+" + (b) + "=" + (a + b) + " "})
        V(U(2), function(){return "" + (href) + ""})
        V(U(3), function(){"" + (href) + ""})

        EACH(U(4), list, function(item, index, $i_4) {

            V(U(5, [$i_4]), "           " + (item) + "          ")

            IF(U(6, [$i_4]), item > 10, function() {})

            EACH(U(7, [$i_4]), item, function(item2, index, $i_7) {
                V(U(8, [$i_4, $i_7]), "                   " + (item2) + "             ")
            })
        })

        IF(U(9), bool, function() {
            V(U(10), "      " + (bool) + "  ")
        })

    }

     * @param  {Node} node
     * @return {Function}
     */
    function compile(node) {
        node = node || document.getElementsByTagName('html')[0];
        // console.log('compile:', node);

        if (node.render) {
            return node.render;
        }

        var code = 'var $$ = arguments.callee\n';
        (function scan(node, eachIndexNameArr, indentN) {
            eachIndexNameArr = (eachIndexNameArr || []).concat();
            indentN = indentN || 1;
            // console.log(node);

            // 标签节点
            if (node.nodeType == 1) {

                // 指令
                var _if = node.getAttribute('if');
                if (_if) {
                    // set node uid
                    setNodeUid(node);

                    // code
                    code += '\n' + Array(indentN).join('  ') + '$$.IF( $$.U(' + uid + ', [' + eachIndexNameArr + ']), ' + _if + ', function(){\n';
                    scanChildren(node, eachIndexNameArr, indentN + 1);
                    code += Array(indentN).join('  ') + '})\n'

                }

                var _each = node.getAttribute('each');
                if (_each && !node.cloneFor) {
                    // set node uid
                    setNodeUid(node);

                    var _eachS = _each.split(' in ');
                    var _item = _eachS[0];
                    var _list = _eachS[1];
                    var $i_n = '$i_' + uid;

                    // code
                    code += '\n' + Array(indentN).join('  ') + '$$.EACH( $$.U(' + uid + ', [' + eachIndexNameArr + ']), ' + _list + ', function(' + _item + ', $index, ' + $i_n + '){\n';
                    eachIndexNameArr.push($i_n);
                    scanChildren(node, eachIndexNameArr, indentN + 1);
                    code += Array(indentN).join('  ') + '})\n'

                }

                if (!_if && !_each) {
                    scanChildren(node, eachIndexNameArr, indentN);
                }

                function scanChildren(node, eachIndexNameArr, indentN) {
                    // 属性
                    // 转成数组，避免增删节点时下标偏差
                    var attributes = toArray(node.attributes);
                    for (var i = 0; i < attributes.length; i++) {
                        if (attributes[i].specified) {
                            scan(attributes[i], eachIndexNameArr, indentN);
                        };
                    };
                    // 子节点
                    var childNodes = toArray(node.childNodes);
                    for (var i = 0; i < childNodes.length; i++) {
                        scan(childNodes[i], eachIndexNameArr, indentN);
                    };
                }

            }
            // 属性，文本，注释 节点
            else if (node.nodeType == 2 || node.nodeType == 3 /*|| node.nodeType == 8*/ ) {

                // ie 低版本标签即使没有写某属性，也会在 tag.attributes 中
                // ie7 attr 下会有 true 的情况。如 [spellcheck], 所以要转成字符串
                var nodeValue = node.nodeValue + '';

                // 不含表达式则不处理
                if (!nodeValue.match('{{')) {
                    return
                }

                // set node uid
                setNodeUid(node);

                // code
                code += Array(indentN).join('  ') + '$$.V( $$.U(' + uid + ', [' + eachIndexNameArr + ']), ' + parse(nodeValue) + ')\n';

            }
        })(node);
        // code += '\nconsole.warn("debug")';
        // console.log(code);

        // var render = Function(code);
        // render.IF = IF;
        // render.EACH = EACH;
        // render.V = V;
        // render.U = U;

        var render = function(data) {
            if (!data && render.fn) {
                render.fn(render.data);
                return;
            };
            var vars = dataToVars(data);
            var fn = Function('_data_', vars + code);
            fn.IF = IF;
            fn.EACH = EACH;
            fn.V = V;
            fn.U = U;
            render.fn = fn;
            render.data = data;

            fn(data);
        };

        node.code = code; // test
        node.render = render; // test
        return render;
    }

    /**
     * 'a+b={{a+b}};'
     * =>
     * '"a+b="+(a+b)+";"'
     *
     * @param  {[type]} mark [description]
     * @return {[type]}      [description]
     */
    function parse(mark, kuo) {
        kuo = kuo || "'"; // todo
        // return '"' + mark.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+(function(){try{return $1}catch(e){return ""}}())+"') + '"';
        return '"' + mark.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+($1)+"') + '"';
    }

    /**
     * set node mark
     *
     * @param {Node} node
     * @param {Boolean} bool - if true remove node
     */
    function setMark(node, bool) {
        var mark = node.mark;
        if (!mark) {
            mark = document.createComment('mark');
            node.parentNode.insertBefore(mark, node);
            node.mark = mark; // todo fuck ie
            mark.node = node;
            bool || node.parentNode.removeChild(node);
        }
        return mark;
    }

    /**
     * update node if the node text changed
     *
     * @param {Uid|Vnode|Node} uid
     * @param {String} str - node.value
     */
    function V(uid, str) {
        var vnode = uidMap[uid] || {};
        var node = vnode.node || uid.node || uid;
        var value = vnode.value || node.value || node.nodeValue;
        if (str != value) {
            // save value
            vnode.value = str;
            // update dom
            node.nodeValue = str;
        }

        // data-src
        if (node.name == 'data-src') {
            node.ownerElement.src = str;
        }
    }

    /**
     * IF directive
     *
     * @param {Uid|Vnode|Node}   uid
     * @param {Boolean}   direct
     * @param {Function} fn - if true fn()
     */
    function IF(uid, direct, fn) {
        var vnode = uidMap[uid] || {};
        var node = vnode.node || uid.node || uid;
        var bool = direct;

        var mark = setMark(node, true);
        // setTimeout(function () {
        //     mark.nodeValue = node.cloneNode().outerHTML;
        // },100);

        if (bool) {
            fn && fn();
            node.parentNode || mark.parentNode.insertBefore(node, mark);
        } else {
            node.parentNode && node.parentNode.removeChild(node);
        }
    }

    /**
     * clone node with uid
     *
     * @param {Node} node [description]
     */
    function C(node, index) {
        var cloneNode = node.cloneNode(true);

        /*
        set clone node uid: "node.uid>index"

        <ul>
            <li for 4 remove>
                text 5
                <ul 6>
                    <li for 7>
                        text 8
                    </li>
                </ul>
            </li>

            <li "4[0]">
                text "5[0]"
                <ul "6[0]">
                    <li "7[0]" remove>
                        text "8[0]"
                    </li>

                    <li "7[0][0]">
                        text "8[0][0]"
                    </li>
                    <li "7[0][1]">
                        text "8[0][1]"
                    </li>
                </ul>
            </li>
        </ul>
        */
        (function loop(node, cloneNode) {
            if (node.nodeType == 1) {
                // 没有指令的标签不设置 uid
                var _if = node.getAttribute('if');
                var _each = node.getAttribute('each');
                if (_if || _each) {
                    setNodeUid(cloneNode, getNodeUid(node), index);
                }

                var attributes = toArray(node.attributes);
                var cloneAttributes = toArray(cloneNode.attributes);
                for (var i = 0; i < attributes.length; i++) {
                    if (attributes[i].specified) {
                        loop(attributes[i], cloneAttributes[i]);
                    };
                };
                // 子节点
                var childNodes = toArray(node.childNodes);
                var cloneChildNodes = toArray(cloneNode.childNodes);
                for (var i = 0; i < childNodes.length; i++) {
                    loop(childNodes[i], cloneChildNodes[i]);
                };
            } else
            if (node.nodeType == 2 || node.nodeType == 3 || node.nodeType == 8) {
                var text = (node.nodeValue || node.value || '') + '';

                // 不含表达式则不处理
                if (!text.match('{{')) {
                    return
                }

                // set node uid
                setNodeUid(cloneNode, getNodeUid(node), index);
            }
        })(node, cloneNode);

        return cloneNode;
    }

    /**
     * EACH directive
     *
     * @param {Uid|Vnode|Node}   uid
     * @param {Array}   direct
     * @param {Function} fn - for list fn(item, key, i)
     */
    function EACH(uid, direct, fn) {
        // todo lazy run


        var vnode = uidMap[uid] || {};
        var node = vnode.node || uid.node || uid;
        var list = direct;

        var mark = setMark(node, false);
        // setTimeout(function () {
        //  // console.log('执行很多次...')
        //     mark.nodeValue = node.cloneNode().outerHTML;
        // },100);m

        var keys = Object.keys(list || []); // todo 考虑不使用这种方法，据说下标顺序可能不准确
        var cloneLength = node.cloneLength || 0;
        var maxLength = Math.max(cloneLength, keys.length)
        for (var i = 0; i < maxLength; i++) {
            var key = keys[i];
            var item = list[key];

            // clone
            var cloneNode = node['clone' + i]; // todo index to key
            if (!cloneNode) {
                // cloneNode = node.cloneNode(true);
                // clone node and set uid by "node.uid>index"
                cloneNode = C(node, i);
                cloneNode.cloneFor = node;
                cloneNode.setAttribute('index', i);
                node['clone' + i] = cloneNode; // todo 这样保存的话，低版本的ie不支持在标签属性保存对象
                // console.log('cloneNode', cloneNode);
            }

            // insert
            if (i >= cloneLength) {
                cloneNode.parentNode || mark.parentNode.insertBefore(cloneNode, mark);
            } else
            // remove
            if (i < cloneLength && i >= keys.length) {
                cloneNode.parentNode && cloneNode.parentNode.removeChild(cloneNode);
            }

            // fn()
            i < keys.length && fn && fn(item, key, i);
        }
        node.cloneLength = keys.length;
    }

    /**
     * observe obj
     *
     * @param  {Object}   obj
     * @param  {Object}   keys - option
     * @param  {Function} fn  obj chanaged callback
     */
    function observe(obj, keys, fn) {
        fn = arguments[arguments.length - 1];
        keys = arguments.length > 2 ? keys : obj;
        for (var i in keys) {
            if (!obj.hasOwnProperty(i)) continue;
            (function() {
                var key = i;
                var value = keys[i];
                Object.defineProperty(obj, i, {
                    set: function(v) {
                        console.error('debug:', 'set', obj, key, v);
                        value = v;
                        fn();
                        // deep
                        if (typeof v == 'object') {
                            observe(v, fn);
                        }
                    },
                    get: function() {
                        console.error('debug:', 'get', obj, key, value);
                        return value;
                    }
                });
                // deep
                if (typeof value == 'object') {
                    observe(value, fn);
                }
            })();
        }
    }

    /**
     *
     * vm = v({
     *      node: document.body,
     *      data: {
     *          db: db
     *      }
     * })
     *
     * @param  {Object} options
     * @return {Object}
     */
    // --
    function v(options) {
        options = options || {};
        var render = compile(options.node);
        var vm = options.data || {};

        vm.$render = function() {
            render();
        };
        vm.$set = function(key, val) {
            observe(vm, { key: val }, render);
        }
        render();

        observe(vm, function() {
            render();
        })
        return vm;
    }






    /**
     * api
     * @param  {Node} node - option
     * @param  {Object} data
     * @return {Function} - render function
     */
    var domTpl = function(node, data) {
        if (node && node.constructor == Object) {
            data = node;
            node = undefined;
        }
        var render = compile(node);
        data && render(data);
        return render
    };

    // export
    if (typeof define == 'function') {
        define(function(require, exports, module) {
            return module.exports = domTpl;
        })
    } else {
        global.domTpl = domTpl;
        // global.observe = observe;
        // global.compile = compile;
    }

})('undefined' != typeof window ? window : this);
