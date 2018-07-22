
















_$$(1, 'value', ++vm.n)




_$$(2, 'value', value)

var nodeInfoMap = {

}
function update(nid, dir, value) {
	var nodeInfo = nodeInfoMap[each.ii+nid];
	if (nodeInfo.value !== value) {
		nodeInfo.value = value;
		dirs[dir](dir,value)
	}
}

var dirArgs = {
	0: 'attr:class.active',
	1: 'attr',
	2: 'class',
	3: 'active',
}