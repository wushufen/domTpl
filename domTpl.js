var utils = {
    toArray: function(list) {
        if (!list) return []
        var length = list.length
        var arr = new Array(length)
        while (length--) {
            arr[length] = list[length]
        }
        return arr
    },
    each: function(list, fn) {
        if (list && 'length' in list) {
            for (var i = 0; i < list.length; i++) {
                var item = list[i]
                fn(item, i, i, list)
            }
        } else {
            var i = 0
            for (var key in list) {
                if (!$.hasOwn(list, key)) continue
                var item = list[key]
                fn(item, key, i++, list)
            }
        }
    },
    indexOf: function(array, value) {
        if (array.indexOf) {
            return array.indexOf(value)
        } else {
            for (var i = 0; i < array.length; i++) {
                if (array[i] == value) {
                    return i
                }
            }
        }
        return -1
    },
    strVars: function(s, vs) {
        for (var k in vs) {
            s = s.replace(RegExp(k, 'g'), vs[k])
        }
        return s + '\n'
    },
    parseText: function(text) {
        return '"' + text
            // }}(["\]){{ -> "\"text\\"
            .replace(/(^|}}).*?({{|$)/g, function($) {
                return $.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
            })
            // \n -> "\n code"
            .replace(/\r?\n/g, '\\n')
            // {{exp}} -> "+(exp)+"
            .replace(/{{(.*?)}}/g, '"+($1)+"')
            // 
            +
            '"'
    },
}



VNode.map = {}
VNode.forKeyPath = ''

function VNode(nodeOrVid, cloneVid) {
    if (!(this instanceof VNode)) return new VNode(nodeOrVid, cloneVid)

    if (typeof nodeOrVid == 'object') {
        this.node = nodeOrVid
        var vid = this.getVid()
        // save
        if (!vid || cloneVid) {
            vid = cloneVid || (VNode._inc = (VNode._inc || 0) + 1)
            this.setVid(vid)
            VNode.map[vid] = this
        }
        return VNode.map[vid]
    }

    // VNode(1)
    var vid = nodeOrVid
    return VNode.map[vid + VNode.forKeyPath]

}
VNode.getDirs = function (node) {
    var dirs = Array(10)

    utils.each(utils.toArray(node.attributes), function (attribute) {
        if (!attribute.specified) return

        var nodeName = attribute.nodeName
        var nodeValue = attribute.nodeValue

        //                       dir        .arg        :mdfs
        var m = nodeName.match(/([^.:]*)(?:\.([^.:]+))?(.*)/) || []
        var name = m[1] || 'property'

        if (name in VNode.prototype) {
            if (name == 'for' && !nodeValue.match(' in ')) return
            node.removeAttribute(nodeName) // !@dev

            var dir = {
                name: name,
                arg: m[2] || '',
                mdfs: m[3] || '',
                value: nodeValue || '""'
            }

            var xdirs = 'for,if'.split(',')
            var index = utils.indexOf(xdirs, name)
            if (index > -1) {
                dirs[index] = dir
                dirs[name] = dir
            }else {
                dirs.push(dir)
            }
        }
    })
    return dirs
}
VNode.prototype = {
    setVid: function (vid) {
        this.vid = vid
        var node = this.node
        if (node.nodeType == 1) {
            node.vid = vid
            node.setAttribute('vid', vid) // @dev
        }
        if (node.nodeType == 3) {
            var vidNodeMap = node.parentNode.vidNodeMap || (node.parentNode.vidNodeMap = {})
            vidNodeMap[vid] = node
        }
    },
    getVid: function () {
        if (this.vid) {
            return this.vid
        }
        var node = this.node
        if (node.nodeType == 1) {
            return node.vid
        }
        if (node.nodeType == 3) {
            var vidNodeMap = node.parentNode.vidNodeMap
            for (var vid in vidNodeMap) {
                if (vidNodeMap[vid] == node) {
                    return vid
                }
            }
        }
    },
    property: function (name, value) {
        if (arguments.length == 1) {
            return this.node[name]
        }
        this.node[name] = value
    },
    mark: function () {
        if (this.node.markNode) return
        var node = this.node
        var markNode = document.createComment(this.vid())
        node.markNode = markNode
        markNode.node = node
        node.parentNode.insertBefore(markNode, node)
    },
    remove: function () {
        var node = this.node
        var parentNode = node.parentNode
        if (parentNode && parentNode.nodeType == 1) {
            this.mark()
            parentNode.removeChild(node)
        }
    },
    insert: function () {
        var node = this.node
        var parentNode = node.parentNode
        if (!parentNode || parentNode.nodeType != 1) {
            var markNode = node.markNode || node.forNode.markNode
            markNode.parentNode.insertBefore(node, markNode)
        }
    },
    'if': function (value, fn) {
        if (value) {
            this.insert()
            fn()
        } else {
            this.remove()
        }
    },
    isIf: function (_true) {
        if (!_true) {
            return this.node.isIf
        } else {
            this.node.isIf = true
        }
    },
    clone: function (key) {
        var node = this.node
        var clones = this.clones || (this.clones = {})
        if (clones[key]) return clones[key]

        var cloneNode = node.cloneNode(true)
        cloneNode.forNode = node
        clones[key] = cloneNode

        'IIF', function loop(node, cloneNode) {
            var vid = VNode.vid(node)
            if (vid) {
                VNode(cloneNode, vid + VNode.forKeyPath)
            }
            var childNodes = node.childNodes
            var cloneChildNodes = cloneNode.childNodes
            for (var i = 0; i < childNodes.length; i++) {
                loop(childNodes[i], cloneChildNodes[i])
            }
        }(node, cloneNode)

        return clones[key] = VNode(cloneNode)
    },
    'for': function (list, fn) {
        this.remove()

        var forVnode = this

        var forKeyPath = VNode.forKeyPath
        utils.each(list, function (item, key, index, list) {
            VNode.forKeyPath = forKeyPath + '.' + key
            var vnode = forVnode.clone(key)
            if (!vnode.isIf()) {
                vnode.insert()
            }
            fn(item, key, index, list)
        })
        VNode.forKeyPath = forKeyPath

        // remove
        var clones = this.clones
        for (var key in clones) {
            var vnode = clones[key]
            if (!list || !(key in list)) {
                vnode.remove()
            }
        }
    }
}

function compile(node) {
    var code = ''

    'IIF', function scan(node) {

        if (node.nodeType == 1) {

            var vnode = VNode(node)
            var dirs = VNode.getDirs(node)

            utils.each(dirs, function (dir) {
                if (!dir) return

                switch(dir.name){
                    case 'for':
                        var for_ = dir.value
                        var item_list = for_.split(' in ')
                        var list_ = item_list[1]
                        var item_ = item_list[0]
                        var key_ = '$key'
                        var index_ = '$index'

                        var item_m = item_.match(/\((.*)\)/) // (item, key, index)
                        if (item_m) {
                            var item_key_index = item_m[1].split(',')
                            item_ = item_key_index[0]
                            key_ = item_key_index[1]
                            index_ = item_key_index[2]
                        }
                        code += utils.strVars('VNode(@vid)["for"]( @list, function( @item, @key, @index, @list ){ ', {
                            '@vid': vnode.vid,
                            '@list': list_,
                            '@item': item_,
                            '@key': key_,
                            '@index': index_
                        })
                    break
                    case 'if':
                        vnode.isIf(true)
                        code += utils.strVars('VNode(@vid)["if"]( @value, function(){ ', {
                            '@vid': vnode.vid,
                            '@value': dir.value
                        })
                    break
                    case 'property':
                        code += utils.strVars('VNode(@vid).property( "@arg", @value )', {
                            '@vid': vnode.vid,
                            '@arg': {
                                innertext: 'innerText',
                                innerhtml: 'innerHTML'
                            }[dir.arg] || dir.arg,
                            '@value': dir.value
                        })
                }
            })


            // compile childNodes
            var childNodes = utils.toArray(node.childNodes)
            for (var i = 0; i < childNodes.length; i++) {
                scan(childNodes[i])
            }

            // end for if
            if (dirs['for']) code += '})\n'
            if (dirs['if']) code += '})\n'

        }

    }(node)

    return code
}

function View(node, data) {
    
}
