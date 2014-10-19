(function (angular) {
'use strict';

angular.module('mvd.contentfulProvider', [])
  .provider('contentful', function () {
    var debug = false
      , _push = [].push
      , _slice = [].slice
      , sysParams = ['id','type','updatedAt','createdAt']
      , excludeParams = ['limit', 'order', 'content_type']
      , logger
      , _log = function () {
        if (!debug) {
          return;
        };
        var args = _slice.call(arguments, 0);
        logger.debug.apply(logger, args);
      }
      , auth = {
        accessToken: '',
        space: ''
      }
      // additional options to pass through to create client
      // if auth properties are specified here, they override auth above
      , options = {}
      // Default params passed on each search
      , queryOpts = {}
      , provider = this;

    provider.setAuth = function (accessToken, space) {
      if (angular.isObject(accessToken)) {
        angular.extend(auth, accessToken);
      } else {
        auth.accessToken = accessToken;
        auth.space = space;
      }
      return provider;
    }

    provider.setClientOptions = function (opts) {
      options = opts;
    }

    provider.setDebug = function (val) {
      debug = val;
    }

    provider.setQueryOptions = function (opts) {
      queryOpts = opts;
    };

    var _buildParams = function (params) {
      params = angular.extend({}, queryOpts, params);
      var out = {}; 
      for (var prop in params) {
        if (!params.hasOwnProperty(prop)) {
          continue;
        }
        var val = params[prop];
        if (sysParams.indexOf(prop) >= 0) {
          prop = 'sys.' + prop;
        } else if (excludeParams.indexOf(prop) < 0) {
          prop = 'fields.' + prop;
        }
        out[prop] = val;
      }
      return out;
    }

    var normalizeItem = function (item) {
      var sys = item.sys
        , el = angular.copy(item.fields);
      for (var prop in el) {
        if (!el.hasOwnProperty(prop)) {
          continue;
        }
        var val = el[prop];
        if (angular.isObject(val) && angular.isDefined(val.sys) && angular.isDefined(val.fields)) {
          // Is a contentful entity itself, normalize this as well
          el[prop] = normalizeItem(val);
        }
      }
      for (var i = 0, ii = sysParams.length; i < ii; i++) {
        var sf = sysParams[i];
        // Make sure field doesn't already exist in element
        if (angular.isUndefined(el[sf]) && angular.isDefined(sys[sf])) {
          el[sf] = sys[sf];
        }
      }
      return el;
    }

    provider.normalizeItems = function (items) {
      if (!items) {
        return items;
      };
      var out = [];
      for (var i = 0, ii = items.length; i < ii; i++) {
        var item = items[i]
          , el = normalizeItem(item);
        out.push(el);
      }
      return out;
    }

    var ContentfulProvider = function (client) {
      this._client = client;
      return this;
    }

    ContentfulProvider.prototype = {
      get: function (params, success, error) {
        _log('[get]', arguments);
        var result = {};
        if (!angular.isObject(params)) {
          // If not object, we assume params is id
          params = {
            id: params,
            limit: 1
          };
        } else {
          params.limit = 1;
        }
        params = _buildParams(params);
        this._client.entries(params).then(
          function (res) {
            _log('[get] success', res);
            angular.extend(result, provider.normalizeItems(res)[0]);
            _log('[get] normalized result', result);
            success && success(result);
          },
          function (err) {
            _log('[get] error', err);
            error && error(err);
          }
        );
        return result;
      },
      load: function (params, success, error) {
        _log('[load]', arguments);
        params = _buildParams(params);        
        var result = [];
        this._client.entries(params).then(
          function (res) {
            _log('[load] success', res);
            _push.apply(result, provider.normalizeItems(res));
            _log('[get] normalized result', result);
            success && success(result);
          },
          function (err) {
            _log('[load] error', err);
            error && error(err);
          }
        );
        return result;
      }
    }

    this.$get = ['$log', '$window', function ($log, $window) {
      logger = $log;
      if (!$window.contentful) {
        $log.warn('Contentful API client not loaded, unable to initialize ContentfulProvider');
        return null;
      };

      var opts = angular.extend({}, auth, options);
      var client = $window.contentful.createClient(opts);

      return new ContentfulProvider(client);
    }];

    return this;
  });
})(angular);