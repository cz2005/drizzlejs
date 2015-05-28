Module = D.Module = function(name, app, loader, options) {
    this.name = name;
    this.app = app;
    this.loader = loader;
    options || (options = {});

    this.separatedTemplate = options.separatedTemplate === true;
    parent(Module).call(this, 'M', options);

    this.app.modules[this.id] = this;
    this.actions = this.option('actions') || {};
    this.app.delegateEvent(this);
};

extend(Module, Base, {
    initialize: function() {
        if (this.options.mixin) this.mixin(this.options.mixin);
        this.loadedPromise = chain(this, [this.loadTemplate(), this.loadItems()]);

        this.initLayout();
        this.initStore();
        this.actionContext = assign({
            store: this.store
        }, Request);
    },

    initLayout: function() {
        var options = this.option('layout');
        this.layout = new Layout('layout', this, this.loader, options);
    },

    initStore: function() {
        this.store = {};
        this.autoLoadAfterRender = [];
        this.autoLoadBeforeRender = [];

        mapObj(this.option('store') || {}, function(value, name) {
            if (D.isFunction(value)) value = value.call(this) || {};
            if (value.autoLoad) {
                (value.autoLoad === true ? this.autoLoadBeforeRender : this.autoLoadAfterRender).push(name);
            }
            this.store[name] = Model.create(value.type, this.app, this, value);
        }, this);
    },

    loadTemplate: function() {
        if (!this.separatedTemplate) {
            return chain(this, this.loader.loadTemplate(this), function(template) {
                this.template = template;
            });
        }
    },

    loadItems: function() {
        var me = this;
        this.items = {};
        this.inRegionItems = {};

        return chain(me, mapObj(me.option('items') || {}, function(options, name) {
            var method;
            if (D.isFunction(options)) options = options.call(me);
            if (D.isString(options)) options = {region: options};

            method = options.isModule ? 'loadModule' : 'loadView';
            me.app.getLoader(name)[method](name, me, options).then(function(obj) {
                obj.moduleOptions = options;
                me.items[obj.name] = obj;
                if (options.region) me.inRegionItems[options.region] = obj;
            });
        }));
    },

    setRegion: function(region) {
        this.region = region;
        return chain(this, function() {
            return this.layout.setRegion(region);
        }, function() {
            return this.layout.render();
        }, this.bindGlobalAction, this.initRegions, this);
    },

    bindGlobalAction: function() {
        var ctx = this.actionContext;
        mapObj(this.actions, function(value, key) {
            if (key.slice(0, 4) !== 'app.') return;
            this.listenTo(this.app, key, function(payload) {
                value.call(ctx, payload);
            });
        });
    },

    close: function() {
        return chain(this, function() {
            return this.option('beforeClose');
        }, this.beforeClose, function() {
            return this.layout.close();
        }, this.closeRegions, this.afterClose, function() {
            return this.option('afterClose');
        }, function() {
            this.stopListening();
            delete this.app.modules[this.id];
            delete this.region;
            return this;
        });
    },

    render: function(options) {
        if (!this.region) this.error('region is null');
        this.renderOptions = options || {};

        return chain(this, this.loadedPromise, function() {
            return this.option('beforeRender');
        }, this.beforeRender, this.fetchDataBeforeRender, this.renderItems, this.afterRender, function() {
            return this.option('afterRender');
        }, this.fetchDataAfterRender, this);
    },

    closeRegions: function() {
        var regions = this.regions;
        delete this.regions;

        return chain(this, mapObj(regions, function(region) {
            return region.close();
        }));
    },

    initRegions: function() {
        var id, type;
        if (this.regions) this.closeRegions();
        this.regions = {};
        map(this.layout.$$('[data-region]'), function(item) {
            id = item.getAttribute('data-region');
            type = item.getAttribute('region-type');
            this.regions[id] = Region.create(type, this.app, this, item, id);
        }, this);
    },

    renderItems: function() {
        return chain(this, mapObj(this.inRegionItems, function(item, name) {
            if (!this.regions[name]) this.error('Region:' + name + ' is not defined');
            this.regions[name].show(item);
        }, this));
    },

    fetchDataBeforeRender: function() {
        return chain(this, map(this.autoLoadBeforeRender, function(item) {
            return Request.get(this.store[item]);
        }, this));
    },

    fetchDataAfterRender: function() {
        return chain(this, map(this.autoLoadAfterRender, function(item) {
            return Request.get(this.store[item]);
        }, this));
    },

    dispatch: function(name, payload) {
        var handler;
        if (!payload) {
            payload = name.payload;
            name = name.name;
        }

        handler = this.actions[name];
        if (!D.isFunction(handler)) this.error('No action handler for ' + name);
        return chain(this, function() {
            handler.call(this.actionContext, payload);
        });
    },

    beforeClose: FN,
    beforeRender: FN,
    afterRender: FN,
    afterClose: FN
});

Layout = Module.Layout = function() {
    parent(Layout).apply(this, arguments);
};

extend(Layout, View, {
    initialize: function() {
        this.isLayout = true;
        this.loadedPromise = this.loadTemplate();
    },

    bindActions: FN,
    bindData: FN
});