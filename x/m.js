/**
 * Model
 * @param {Object} obj 
 */
function M(obj) {
    for (var key in obj) {
        this[key] = obj[key]
    }
    this.set = function(attr, value) {
        this[attr] = value;
        console.log('update view');
    }
    this.sync = function() {
        console.log('sync:', this);
    }
}


var todo = new M();
todo.set('text', 1);
todo.set('done', false);
todo.sync()



new M({
    data: {
        id: 1,
        name: 'tom',
    },
    set: function() {},
    sync: function() {},
    save: function() {},
    destroy: function() {},
    update: function() {},
    fetch: function() {},
})


function List() {}
List.prototype = extend([], {
    push: function() {},
    sync: function() {},
    remove: function(model) {

    },
    delete: function(model) {
        model.destroy();
    },
});


var todoList = new List({
	Model: '',
	url: {
		delete: 'delte/todo/:id',
		save: 'save/todo/:obj',
		update: 'update/todo/:obj',
		fetch: 'fetch/todo',
	}
});
