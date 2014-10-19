(function (angular) {
'use strict';

angular.module('mvd.contentfulProvider', [])
  .provider('contentful', function () {
    var debug = false
      , _push = [].push
      , _slice = [].slice
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

    provider.setDebug = function (val) {
      debug = val;
    }

    provider.setQueryOptions = function (opts) {
      queryOpts = opts;
    };

    var _buildParams = function (params) {
      return angular.extend({}, queryOpts, params);
    }


    provider.normalizeItems = function (items) {
      if (!items) {
        return items;
      };
      var out = [];
      var sysFields = ['id','type','updatedAt','createdAt'];
      for (var i = 0, ii = items.length; i < ii; i++) {
        var it = items[i]
          , sys = it.sys
          , el = angular.copy(it.fields);
        for (var j = 0, jj = sysFields.length; j < jj; j++) {
          var sf = sysFields[j];
          // Make sure field doesn't already exist in element
          if (angular.isUndefined(el[sf]) && angular.isDefined(sys[sf])) {
            el[sf] = sys[sf];
          }
        }
        out.push(el);
      }
      return out;
    }

    var ContentfulProvider = function (client) {
      this._client = client;
      return this;
    }

    ContentfulProvider.prototype = {
      get: function (id, success, error) {
        _log('[get]', arguments);
        var result = {};
        var params = _buildParams({
          'sys.id': id,
          limit: 1
        });
        this._client.entries(params).then(
          function (res) {
            _log('[get] success', res);
            angular.extend(result, provider.normalizeItems(res)[0]);
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