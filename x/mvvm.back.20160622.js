/**
<div data="vm">

    {{a}}+{{b}}={{a+b}}

    <input model="a" />
    <input model="b" />

    <a href="{{href}}">{{href}}</a>

    <ul>
        <li each="list item i">
            {{item}}

            <span if="item>10"> 10+ </span>

        </li>
    </ul>

    <div if="bool">
        {{bool}}
    </div>
</div>


=>


uidMap={
    uid:{
        node:node,
        nodeType:3,
        text:'{{a}}+{{b}}={{a+b}}',
        t1: '8'
        t2: '18'
    },
    uid:{
        node:'li',
        nodeType:1,
        arr: list,
        clones:{
            'uid-0':{
                
            }
        }
    }
};


function calc(){
    width(vm){
        uidMap['uid'] = (a)+ '+' +(b)+ '=' +(a+b);
        //...

        each(list, function(item, i){
            uidMap['uid:li>{{item}}'] = (item);

            if(item>10){
                uidMap['uid:item>10'].if = item>10;
            }
        })
    }
}

function update(){
    for(var i in uidMap){
        var vdom = uidMap[i];
        if(vdom.nodeType==3){
            if(vdom.t2 != vdom.t2){
                update(vdom);
                vdom.t2 = vdom.t2;
            }
        }
    }
}

     * @param  {[type]} node [description]
     * @return {[type]}      [description]
     */




/*
{
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
var uid = 0;

/**
 * set node uid
 * @param {Node} node    
 * @param {Number|String} baseUid 
 * @param {Number|Array} index   
 */
function setUid(node, baseUid, index) {
    if (!node.uid) {
        var _uid;
        if (!baseUid) {
            _uid = ++uid;
        } else {
            index = index.length ? index : [index];
            _uid = baseUid;
            for (var i = 0; i < index.length; i++) {
                _uid += '>' + index[i];
            }
        }
        uidMap[_uid] = {
            uid: _uid,
            text: node.value || node.nodeValue || node.cloneNode().outerHTML,
            node: node,
            // nodeType: node.nodeType,
        };
        node.uid = _uid;
    }
    return uidMap;
}

function U(baseUid, arr) {
    arr = arr || [];
    var _uid = baseUid;
    for (var i = 0; i < arr.length; i++) {
        _uid += '>' + arr[i];
    }
    return _uid;
}

function compile(node) {
    node = node || document.getElementsByTagName('html')[0];
    console.log('compile:', node);

    /*var*/
    code = '';
    (function scan(node, forIndexNameArr) {
        forIndexNameArr = forIndexNameArr || [];
        forIndexNameArr = forIndexNameArr.concat();

        // console.log(node);
        // 标签节点
        if (node.nodeType == 1) {

            // 指令
            var _if = node.getAttribute('if');
            if (_if) {
                // set node uid
                setUid(node);

                // code
                code += '\nIF( U(' + uid + ', [' + forIndexNameArr + ']), ' + _if + ', function(){\n\t';
                scanChildren(node, forIndexNameArr);
                code += '})\n'
            }

            var _for = node.getAttribute('for');
            if (_for && !node.cloneFor) {
                // set node uid
                setUid(node);

                var _for2 = _for.split(' of ');
                var _item = _for2[0];
                var _list = _for2[1];
                var $i_n = '$i_' + uid;

                // code
                code += '\nFOR( U(' + uid + ', [' + forIndexNameArr + ']), ' + _list + ', function(' + _item + ', index, ' + $i_n + '){\n\t';
                forIndexNameArr.push($i_n);
                scanChildren(node, forIndexNameArr);
                code += '})\n'
            }

            if (!_if && !_for) {
                scanChildren(node, forIndexNameArr);
            }

            function scanChildren(node, forIndexNameArr) {
                // 属性
                // 转成数组，避免增删节点时下标偏差
                var attributes = toArray(node.attributes);
                for (var i = 0; i < attributes.length; i++) {
                    if (attributes[i].specified) {
                        scan(attributes[i], forIndexNameArr);
                    };
                };
                // 子节点
                var childNodes = toArray(node.childNodes);
                for (var i = 0; i < childNodes.length; i++) {
                    scan(childNodes[i], forIndexNameArr);
                };
            }

        } else
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

            // set node uid
            setUid(node);

            // code
            code += 'V( U(' + uid + ', [' + forIndexNameArr + ']), ' + parse(text) + ')\n';

        }
    })(node);
    // code += '\nconsole.warn("debug")'
    // console.log(code);
}


function nodeFor(node, list) {
    if (node.cloneFor) {
        return
    }

    var mark = node.mark;
    if (!mark) {
        mark = document.createComment('mark');
        node.parentNode.insertBefore(mark, node);
        node.mark = mark;
        node.parentNode && node.parentNode.removeChild(node);
    }
    var uid = node.uid;
    node.cloneLength = node.cloneLength || 0;
    var length = Math.max(node.cloneLength, list.length);
    for (var i = 0; i < length; i++) {
        var cloneNode = node['clone' + i];
        if (!cloneNode) {
            console.log('clone')
            cloneNode = node.cloneNode(true);
            cloneNode.cloneFor = node;
            cloneNode.setAttribute('index', i);
            node['clone' + i] = cloneNode;
            compile(cloneNode)
        }
        if (i >= node.cloneLength) {
            console.log('add>', node.cloneLength)
            cloneNode.parentNode || mark.parentNode.insertBefore(cloneNode, mark);
        } else if (i < node.cloneLength && i >= list.length) {
            console.log('<remove', node.cloneLength)
            cloneNode.parentNode && cloneNode.parentNode.removeChild(cloneNode);
        }
        console.log(i, node.cloneLength, list.length)
    }
    node.cloneLength = list.length;
}

/**
 * 'a+b={{a+b}};'
 * =>
 * '"a+b="+(a+b)+";"'
 * @param  {[type]} mark [description]
 * @return {[type]}      [description]
 */
function parse(mark, kuo) {
    kuo = kuo || "'"; // todo
    // return '"' + mark.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+(function(){try{return $1}catch(e){return ""}}())+"') + '"';
    return '"' + mark.replace(/\r?\n/g, '').replace(/"/g, '\\"').replace(/{{(.*?)}}/g, '"+($1)+"') + '"';
}


function update() {
    for (var i in uidMap) {
        var nodeInfo = uidMap[i];
        var node = nodeInfo.node;
        if (nodeInfo.nodeType == 3 || nodeInfo.nodeType == 2) {
            if (nodeInfo.t2 != nodeInfo.t2) {
                node.value = node.nodeValue = nodeInfo.t2;
                nodeInfo.t2 = nodeInfo.t2;
            }
        }
    }
}

var toArray = function() {
    try {
        [].slice.call(document.childNodes); // ie xx
        return function(likeArray) {
            return [].slice.call(likeArray);
        }
    } catch (e) {
        return function(likeArray) {
            var arr = [];
            for (var i = 0; i < likeArray.length; i++) {
                arr.push(likeArray[i]);
            };
            return arr;
        }
    }
}();


a = 1
b = 2
bool = true
href = 123
list = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ]
    // compile();
    // eval(code);
    // update();



function result() {

    /* {{a}}+{{b}}={{a+b}} */
    uidMap[1].t2 = "    " + (a) + "+" + (b) + "=" + (a + b) + " "

    /*{{href}}*/
    uidMap[2].t2 = "" + (href) + ""

    /*{{href}}*/
    uidMap[3].t2 = "" + (href) + ""

    /*<li for="item of list"></li>*/
    nodeFor(uidMap[4].node, list)
    for (var i4 = 0; i4 < list.length; i4++) {
        var item = list[i4];

        /* {{item}} */
        uidMap[5].t2 = "            " + (item) + "          "

        /*<span if="item>10"></span>*/
        nodeIf(uidMap[6].node, item > 10)
        if (item > 10) {}

        /*<li for="item2 of item"></li>*/
        nodeFor(uidMap[7].node, item)
        for (var i7 = 0; i7 < item.length; i7++) {
            var item2 = item[i7];

            /* {{item2}} */
            uidMap[8].t2 = "                    " + (item2) + "             "
        }
    }

    /*<div if="bool"></div>*/
    nodeIf(uidMap[9].node, bool)
    if (bool) {
        /* {{bool}} */
        uidMap[10].t2 = "       " + (bool) + "  "
    }

    console.warn("debug")

}




`
<ul>
    <li 4>
        text 5
        <ul 6>
            <li 7>
                text 8
            </li>
        </ul>
    </li>


    <li 4-0>
        text 5-0
        <ul 6-0>
            <li 7-0>
                text 8-0
            </li>

            <li 7-0-0>
                text 8-0-0
            </li>
        </ul>
    </li>
</ul>
`


function result() {

    V(1, "   " + (a) + "+" + (b) + "=" + (a + b) + " ")
    V(2, "" + (href) + "")
    V(3, "" + (href) + "")

    FOR(4, list, function(item, index, $i_4) {

        V(5 + '-' + index, "           " + (item) + "          ")

        IF(6, item > 10, function() {})

        FOR(7, item, function(item2, index) {
            V(8, "                   " + (item2) + "             ")
        })

    })

    IF(9, bool, function() {
        V(10, "      " + (bool) + "  ")
    })

}


function result() {

    V(1, "   " + (a) + "+" + (b) + "=" + (a + b) + " ")
    V(2, "" + (href) + "")
    V(3, "" + (href) + "")

    FOR(4, list, function(item, index, $i_4) {

        V(5 + ">" + $i_4, "           " + (item) + "          ")

        IF(6 + ">" + $i_4, item > 10, function() {})

        FOR(7 + ">" + $i_4, item, function(item2, index, $i_7) {
            V(8 + ">" + $i_4 + ">" + $i_7, "                   " + (item2) + "             ")
        })
    })

    IF(9, bool, function() {
        V(10, "      " + (bool) + "  ")
    })

}


function result() {

    V(U(1), "   " + (a) + "+" + (b) + "=" + (a + b) + " ")
    V(U(2), "" + (href) + "")
    V(U(3), "" + (href) + "")

    FOR(U(4), list, function(item, index, $i_4) {

        V(U(5, [$i_4]), "           " + (item) + "          ")

        IF(U(6, [$i_4]), item > 10, function() {})

        FOR(U(7, [$i_4]), item, function(item2, index, $i_7) {
            V(U(8, [$i_4, $i_7]), "                   " + (item2) + "             ")
        })
    })

    IF(U(9), bool, function() {
        V(U(10), "      " + (bool) + "  ")
    })

}



/**
 * set mark
 * @param {Node} node 
 * @param {Boolean} bool - if remove node
 */
function M(node, str, bool) {
    var mark = node.mark;
    if (!mark) {
        mark = document.createComment(str || 'mark');
        node.parentNode.insertBefore(mark, node);
        node.mark = mark;
        mark.node = node;
        bool || node.parentNode.removeChild(node);
    }
    return mark;
}

/**
 * update node
 * @param {Uid|Vnode|Node} uid 
 * @param {String} str - node.value
 */
function V(uid, str) {
    var vnode = uidMap[uid] || {};
    var node = vnode.node || uid.node || uid;
    var value = vnode.value || node.value || node.nodeValue;
    if (str != value) {
        vnode.value = node.value = node.nodeValue = str;
    }
}

/**
 * node if directive
 * @param {Uid|Vnode|Node}   uid   
 * @param {Boolean}   direct 
 * @param {Function} fn - if true fn()
 */
function IF(uid, direct, fn) {
    var vnode = uidMap[uid] || {};
    var node = vnode.node || uid.node || uid;
    var bool = direct;

    var mark = M(node, node.cloneNode().outerHTML, true);

    if (bool) {
        fn && fn();
        node.parentNode || mark.parentNode.insertBefore(node, mark);
    } else {
        node.parentNode && node.parentNode.removeChild(node);
    }
}

/**
 * clone node with uid
 * @param {Node} node [description]
 */
function C(node, index) {
    var cloneNode = node.cloneNode(true);

    // uid
    // =>
    // uid>0
    // deep
    (function loop(node, cloneNode) {
        if (node.nodeType == 1) {
            setUid(cloneNode, node.uid, index);

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
            setUid(cloneNode, node.uid, index);
        }
    })(node, cloneNode);

    return cloneNode;
}

/**
 * node for directive
 * @param {Uid|Vnode|Node}   uid   
 * @param {Array}   direct 
 * @param {Function} fn - for list fn(item, key, i)
 */
function FOR(uid, direct, fn) {
    var vnode = uidMap[uid] || {};
    var node = vnode.node || uid.node || uid;
    var list = direct;

    var mark = M(node, node.cloneNode().outerHTML, false);

    var keys = Object.keys(list);
    var cloneLength = node.cloneLength || 0;
    var maxLength = Math.max(cloneLength, keys.length)
    for (var i = 0; i < maxLength; i++) {
        var key = keys[i];
        var item = list[key];

        // clone
        var cloneNode = node['clone' + i]; // todo index to key
        if (!cloneNode) {
            // cloneNode = node.cloneNode(true);
            cloneNode = C(node, i);
            cloneNode.cloneFor = node;
            cloneNode.setAttribute('index', i);
            node['clone' + i] = cloneNode;
            console.log('cloneNode', cloneNode);

            // map clone node uid to node
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
