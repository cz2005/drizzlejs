var D = require('drizzlejs'),
    _ = require('lodash/collection');


module.exports = {
    store: {todos: {data: []}},

    actions: {
        createTodo: function(payload) {
            var todos = this.store.todos;
            todos.data.unshift({id: D.uniqueId('todo'), text: payload.text, completed: false});
            todos.changed();
        },

        updateTodo: function(payload) {
            var todos = this.store.todos;
            _.find(todos.data, 'id', payload.id).text = payload.text;
            todos.changed();
        },

        removeTodo: function(payload) {
            var todos = this.store.todos;
            todos.set(_.reject(todos.data, {id: payload.id}), true);
        },

        completeTodo: function(payload) {
            var todos = this.store.todos;
            _.find(todos.data, {id: payload.id}).completed = payload.completed;
            todos.changed();
        },

        toggleAllTodos: function(payload) {
            var todos = this.store.todos;
            _.map(todos.data, function(item) {
                item.completed = payload.completed;
            })
            todos.changed()
        },

        clearCompleted: function() {
            var todos = this.store.todos;
            todos.set(_.reject(todos.data, {completed: true}), true);
        }
    },

    items: {
        header: 'header',
        main: 'main',
        footer: 'footer'
    },

    extend: {
        filter: function(id) {
            this.filterKey = id;
            this.items.main.render();
            this.items.footer.render();
        }
    }
}