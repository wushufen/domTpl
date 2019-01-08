# domTpl
基于 dom 的高性能模板引擎

## 特性
* 基于dom而不是字符串
* 模板直接写在目标位置，无需 script 标签或字符串保存模板
* 模板内支持访问全局变量
* 简单高效，体积小，无依赖
* 支持 require.js, sea.js

## 如何使用
```html
<!DOCTYPE html>
<html>
  <head>

    <!-- 1.引入 domTpl.js -->
    <script src="../domTpl.js"></script>

  </head>
  <body>

    <!-- 2.模板 -->
    <ul>
      <li each="item in list">
        {{item.name}}
        <span if="item.age>=18">adult</span>
      </li>
    </ul>

    <!-- 3.渲染 -->
    <script>
    var render = domTpl();
    render({
      list:[
        {name:'tom', age:20},
        {name:'lily', age:17}
      ]
    });
    </script>

  </body>
</html>
```

## API
```javascript
render = domTpl(node, data)
```
```javascript
node: 可选。默认为 html 节点
data: 可选。如果提供则直接渲染
redner(data): 编译返回的渲染函数
  data: 可选。如不提供则使用 domTpl 的参数 data
```

## EXAMPLE
* [hello world](https://wusfen.github.io/domTpl/example/helloWorld.html) | [源码](example/helloWorld.html)
* [list](https://wusfen.github.io/domTpl/example/list.html) | [源码](example/list.html)
* [ajax](https://wusfen.github.io/domTpl/example/ajax.html) | [源码](example/ajax.html)
* [time 时钟](https://wusfen.github.io/domTpl/example/time.html) | [源码](example/time.html)
* [performance test 性能测试](https://wusfen.github.io/domTpl/example/bigArray.html) | [源码](example/bigArray.html)
