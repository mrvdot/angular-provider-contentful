/* global describe it module beforeEach */
describe('Contentful Provider', function () {
  var mockClient, contentful, provider, $window;

  var response = [
    {
      sys: {
        id: 123,
      },
      fields: {
        text: 'my lorem ipsum'
      }
    },
    {
      sys: {
        id: 456,
      },
      fields: {
        text: 'my lorem ipsum again',
        embedded: {
          sys: {
            id: 'abc'
          },
          fields: {
            myField: 'is interesting',
            another: true
          }
        }
      }
    }      
  ]

  beforeEach(function () {
    module('mvd.contentfulProvider', function (contentfulProvider) {
      contentfulProvider.setAuth('myToken', 'mySpace');
      provider = contentfulProvider;
    });
    
    inject(function (_$window_, $timeout) {
      $window = _$window_;
      mockClient = jasmine.createSpyObj('mockClient', ['entries']);
      $window.contentful = {
        createClient: function (opts) {
          return mockClient;
        }
      }

      mockClient.entries.andReturn({
        then: function (successCb, errorCb) {
          if (mockClient._forceError) {
            errorCb(mockClient._forceError);
          } else {
            successCb(mockClient._response || []);
          }
        }
      });

      spyOn($window.contentful, 'createClient').andCallThrough();
    });

    inject(function (_contentful_) {
      contentful = _contentful_;
    });
  });

  it('should create client with specified auth params', function () {
    expect($window.contentful.createClient).toHaveBeenCalledWith({
      accessToken: 'myToken',
      space: 'mySpace'
    });
  });

  it('should search by id on get', function () {
    var entry = response[0];
    mockClient._response = [entry];
    var result = contentful.get(123);
    expect(mockClient.entries).toHaveBeenCalledWith({
      limit: 1,
      'sys.id': 123
    });
    expect(result).toEqual(provider.normalizeItems([entry])[0]);
  });

  it('should search by params on load', function () {
    mockClient._response = response;

    var params = {
      limit: 10,
      order: 'asc' 
    }
    var result = contentful.load(params);
    expect(mockClient.entries).toHaveBeenCalledWith(params);
    expect(result.length).toBe(2);
    var items = provider.normalizeItems(response);
    expect(result[0]).toEqual(items[0]);
    expect(result[1]).toEqual(items[1]);
  });

  it('should normalize embedded entities as well', function () {
    var entry = response[1];
    mockClient._response = [entry];
    var result = contentful.get(456)
      , desired = provider.normalizeItems([entry.fields.embedded])[0];
    expect(result).toEqual(provider.normalizeItems([entry])[0]);
    expect(result.embedded).toEqual(desired);
  })
});