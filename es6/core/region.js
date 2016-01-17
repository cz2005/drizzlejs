const CAPTURES = ['blur', 'focus', 'scroll', 'resize'];

D.Region = class Region extends D.Base {
    constructor (app, mod, el, name) {
        super(name || 'Region', {}, {
            app,
            module: mod,
            _el: el,
            _delegated: {}
        });

        if (!this._el) this._error('The DOM element for region is required');
        app.delegateEvent(this);
    }

    show (renderable, options = {}) {
        if (this._isCurrent(renderable)) {
            if (options.forceRender === false) return this.Promise.resolve(this._current);
            return this._current._render(options, true);
        }

        return this.chain(
            D.isString(renderable) ? this.app._createModule(renderable) : renderable,
            (item) => {
                if (!(item instanceof D.Renderable)) {
                    this._error('The item is expected to be an instance of Renderable');
                }
                return item;
            }, [
                (item) => this.chain(item._region && item._region.close(), item),
                () => this.close()
            ],
            ([item]) => {
                this._current = item;
                const attr = item.module ? `${item.module.name}:${item.name}` : item.name;
                this._getElement().setAttribute('data-current', attr);
                item._setRegion(this);
                return item;
            },
            (item) => item._render(options, false)
        );
    }

    close () {
        return this.chain(
            this._current && this._current._close(),
            () => delete this._current,
            this
        );
    }

    $$ (selector) {
        return this._getElement().querySelectorAll(selector);
    }

    _isCurrent (renderable) {
        if (!this._current) return false;
        if (this._current.name === renderable) return true;
        if (renderable && renderable.id === this._current.id) return true;
        return false;
    }

    _getElement () {
        return this._el;
    }

    _empty () {
        this._getElement().innerHTML = '';
    }

    _createDelegateListener (name) {
        return (e) => {
            if (!this._delegated[name]) return;
            const { target } = e;
            map(this._delegated[name].items, (item) => {
                const els = this._getElement().querySelectorAll(item.selector);
                let matched = false;
                for (let i = 0; i < els.length; i ++) {
                    const el = els[i];
                    if (el === target || el.contains(target)) {
                        matched = el;
                        break;
                    }
                }
                matched && item.fn.call(item.renderable, e);
            });
        };
    }

    _delegateDomEvent (renderable, name, selector, fn) {
        let obj = this._delegated[name];
        if (!obj) {
            obj = this._delegated[name] = { listener: this._createDelegateListener(name), items: [] };
            D.Adapter.addEventListener(this._getElement(), name, obj.listener, CAPTURES.indexOf(name) !== -1);
        }
        obj.items.push({ selector, fn, renderable });
    }

    _undelegateDomEvents (renderable) {
        mapObj(this._delegated, (value, key) => {
            const items = [], obj = value;
            map(obj.items, (item) => {
                if (item.renderable !== renderable) items.push(item);
            });
            obj.items = items;
            if (items.length === 0) {
                delete this._delegated[key];
                D.Adapter.removeEventListener(this._getElement(), key, obj.listener);
            }
        });
    }
};