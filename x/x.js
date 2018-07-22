function V(node, fn) {
    // body...
}





var todoListCom = V(`
 <input model="todoText" v-keyup="addTodo(this.value)" />
 {{todoText}}
 <ul>
     <li each="list as todo">
         <div v-click="todo.done = !todo.done">{{todo.text}}</div>
         <button type="button" v-click="removeTodo(todo)">X</button>
     </li>
 </ul>
`, function() {
 $input = this.fine('input');
 $input.click(function () {
     alert();
 });

    var todoList = [
        {text: 'learn js', done: true}
    ];

    function addTodo(text) {
     todoList.push({
         text: text
     });

     /***/
        $render();
    }

    function removeTodo(todo) {
     todoList.remove(todo);
    }

    /***/
 function $render() {

     ON('uid', 'keyup')

     V('todoText uid', todoText)

     EACH('todo li uid', list, function (todo, $index) {

     })
 }
})
