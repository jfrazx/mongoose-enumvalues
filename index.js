'use strict';

/**
 * eventually
  options {
    only: ['pathName', 'pathName', function],
    find: true,
    findOne: false,
    validateBeforeSave: true,
    virtual: true,
    attach: true,
    modify: false,
  }
*/


/**
 * currently
  options {
    only: ['pathName', 'pathName'],
    find: true,
    findOne: true,
    validateBeforeSave: true,

    virtual: {
      only: ['pathName', 'pathName'],
      properties: {
        propertyName: 'asVirtual',
      }
    },

    attach: {
      only: ['pathName', 'pathName'],
      properties: {
        propertyName: {
          as: 'attachPropertyAs',
          on: ['find', 'findOne']
        }
      }
    },

    modify: {
      only: ['pathName', 'pathName'],
      on: ['find', 'findOne']
    }
  }
*/

/**
*
*
*/
module.exports = function(schema, options) {
  options = setOptions(schema, options);

  const paths = findPaths(schema, options);

  setVirtuals(schema, filterPaths(paths, options.virtual));
  attachProperties(schema, filterPaths(paths, options.attach));
  modifyProperties(schema, filterPaths(paths, options.modify));
};

/**
* Setup handlers for modifying document properties, must be a `lean` object
*
*/
function modifyProperties(schema, paths) {
  if (!paths.length) { return; }

  const options = paths[0].options;

  /**
  * Modify document enum (string) properties to an object, with (original) value and
  * values (enumValues)
  *
  */
  function populatePropertyFor (documents, next) {
    if (this._mongooseOptions.lean) {
      asArray(documents).forEach(function(doc) {
        paths.forEach(function(path) {
          try {
            const splitted = path.path.split('.');
            const key      = splitted.shift();
            const insert   = { values: path.enumValues };
            const value    = doc[key];

            insert.value = determineValue(splitted, value);
            doc[key]     = nest(splitted, insert);
          } catch (error) { return next(error); }
        });
      });
    }

    next();
  }

  /**
  * If a document is modified, this method will locate the value on updates and assign it to the
  * appropriate property, allowing for proper validations later.
  * @param <Function>: next - function that notifies mongoose this middleware is complete
  */
  function reformatUpdateProperty(next) {
    const document = this._update['$set'];

    if (document) {
      paths.forEach(function(path) {
        try {
          const splitted = path.path.split('.');
          const key      = splitted.shift();

          if (document[key] === undefined) { return; }

          const value   = determineValue(splitted, document[key]);

          document[key] = nest(splitted, value);
        } catch (error) { return next(error); }
      });
    }

    next();
  }

  /**
  * If a document is modified, this method will locate the value before save/validation and assign it to the
  * appropriate property, allowing for proper validations later.
  * @param <Function>: next - function that notifies mongoose this middleware is complete
  */
  function reformatProperty(next) {
    const self = this;
    paths.forEach(function(path) {
      try {
        const splitted = path.path.split('.');
        const key      = splitted.shift();
        const value    = determineValue(splitted, self[key]);

        self[key]      = nest(splitted, value);
      } catch (error) { return next(error); }
    });

    next();
  }

  /**
  * Setup handlers for modifying properties -- ['find', 'findOne']
  */
  options.modify.on.forEach(function(on) {
    schema.post(on, populatePropertyFor);
  });

  schema.pre((options.validateBeforeSave ? 'validate' : 'save'), reformatProperty);

  /*
  * Setup handlers for updating documents (there may be more to consider)
  */
  ['update', 'findOneAndUpdate'].forEach(function(on) {
    schema.pre(on, reformatUpdateProperty);
  });
}

/**
* Locate schema paths that are enums
* @param
*/
function findPaths(schema, options) {
  const paths = [];

  schema.eachPath(function(path, type) {
    if (type.enumValues && type.enumValues.length) {
      paths.push(
        {
          path: path,
          enumValues: type.enumValues,
          options: options
        }
      );
    }
  });

  return filterPaths(paths, options);
}

/**
* Filter paths based on allowed paths, which can be: string, callback or a regex
*
*
*/
function filterPaths(paths, allowed) {
  if (!allowed) { return []; }
  if (!allowed.only.length) { return paths; }

  return paths.filter(
    path => {
      let match = false;

      for (const filter of allowed.only) {
        try {
          switch (typeof filter) {
            case 'function':
              match = filter(path.path);
              break;
            case 'string':
              match = path.path === filter;
              break;
            default:
              match = filter.test(path.path);
         }
        } catch (e) {
          throw new Error(`${ typeof filter } is not an allowed filter type. Must be String, RegExp or Function`);
        }
        if (match) { return match; }
      }
      return match;
    }
  );
}

/**
* Setup virtual properties for the document
*
*/
function setVirtuals(schema, paths) {
  paths.forEach(path => {
    const props = path.options.virtual.properties;

    if (props[path.path]) {
      schema.virtual(props[path.path]).get(function() {
        return path.enumValues;
      });
    }
  });
}

/**
* Attach properties to the document
*
*/
function attachProperties(schema, paths) {
  paths.forEach(path => {
    const props = path.options.attach.properties;

    if (props[path.path]) {
      (props[path.path].on || []).forEach(on => {

        /**
        * Setup post callbacks
        */
        schema.post(on, function(documents, next) {
          asArray(documents).forEach(function(doc) {
            paths.forEach(function(path) {
              doc[props[path.path].as] = path.enumValues;
            });
          });

          next();
        });
      });
    }
  });
}

/**
* Traverse the passed document, according to keys, appropriating the desired value
* @param [String]: keys -- an array of keys determining the path to value
* @param Object: doc -- the document that contains the value at keys path
* @return any: -- the value at the end of keys path in document
*/
function determineValue(keys, doc) {
  try {
    for (const key of keys) {
      doc = doc[key];
    }

    /**
      the keys array should transition through any nesting,
      so any object is assumed to be enumValues:
        { value: 'string', enumValues: ['strings'] }
     */
    return typeof doc === 'object' ? doc.value : doc;
  } catch (error) { return doc; }
}

/**
* Nest the insert value into objects with keys from array
*
*/
function nest(array, insert) {
  let obj;

  array.reverse().forEach(key => {
    obj = { [key]: insert };
    insert = obj;
  });

  return insert;
}

/**
* Setup options and defaults
*
*/
function setOptions(schema, options) {
  function setDefaults(array) {
    if (!array.length) {
      if (options.find) { array.push('find'); }
      if (options.findOne || !options.find) { array.push('findOne'); }
    }
  }

  options = options || {};

  options.only = options.only || [];
  options.validateBeforeSave = options.validateBeforeSave === undefined
                                ? schema.options.validateBeforeSave
                                : Boolean(options.validateBeforeSave);

  ['virtual', 'attach', 'modify'].filter(prop => options[prop])
    .forEach(
      prop => {
        if (typeof options[prop] !== 'object') {
          options[prop] = {};
        }
        options[prop].properties = options[prop].properties || {};
        options[prop].only = options[prop].only || Object.keys(options[prop].properties);
      }
    );

  if (options.modify) {
    delete options.modify.properties;
    options.modify.on = options.modify.on || [];
    setDefaults(options.modify.on);
  }
  if (options.attach) {
    Object.keys(options.attach.properties).forEach(property => {
      options.attach.properties[property].on = options.attach.properties[property].on || [];
      setDefaults(options.attach.properties[property].on);
    });
  }

  return options;
}

/**
* Helper function to ensure value is an array
*/
function asArray(array) {
  return Array.isArray(array) ? array : [array];
}
