import type { MongooseQueryMiddleware, Schema, SchemaType } from 'mongoose';

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

type Fields = Record<string, unknown>;

interface Filtered {
  only: enumValues.Filterables[];
}

/**
 * The options once setOptions has filled in every default.
 */
interface ResolvedOptions extends Filtered {
  find?: boolean;
  findOne?: boolean;
  validateBeforeSave?: boolean;
  virtual?: Filtered & { properties: Record<string, string> };
  attach?: Filtered & {
    properties: Record<string, { as: string; on: MongooseQueryMiddleware[] }>;
  };
  modify?: Filtered & { on: MongooseQueryMiddleware[] };
}

interface EnumPath {
  path: string;
  enumValues: unknown[];
  options: ResolvedOptions;
}

/**
 * What `modify` turns an enum path into on a lean read, and what a client
 * then sends back on a write.
 */
interface EnumShape {
  value?: unknown;
  values: unknown[];
}

/**
 * What `this` may be in a post hook. Hook names in `on` are taken on trust,
 * so it is a query only if it has a query's methods.
 */
interface HookContext {
  mongooseOptions?(): { lean?: unknown };
  getOptions?(): { includeResultMetadata?: unknown };
}

/**
 * Mongoose plugin giving access to a schema's enum values: as virtuals,
 * attached to queried documents, or in place of the enum property on lean
 * results.
 */
function enumValues(
  schema: Schema,
  options?: enumValues.EnumValueOptions,
): void {
  const resolved = setOptions(schema, options);

  const paths = findPaths(schema, resolved);

  setVirtuals(schema, filterPaths(paths, resolved.virtual));
  attachProperties(schema, filterPaths(paths, resolved.attach));
  modifyProperties(schema, filterPaths(paths, resolved.modify));
}

// eslint-disable-next-line @typescript-eslint/no-namespace -- D21: carries the types on the one default export
declare namespace enumValues {
  type Filterables = string | RegExp | ((param: string) => boolean);

  interface EnumValueOptions {
    only?: Filterables[];
    find?: boolean;
    findOne?: boolean;
    /**
     * @deprecated Accepted and ignored. It chose which hook `modify`
     * registered its write-side pre hook on, and `modify` no longer uses
     * pre hooks (D33).
     */
    validateBeforeSave?: boolean;
    virtual?: {
      only?: Filterables[];
      properties: {
        [property: string]: string;
      };
    };
    attach?: {
      only?: Filterables[];
      properties: {
        [property: string]: {
          as: string;
          on?: string[];
        };
      };
    };
    modify?:
      | {
          only?: Filterables[];
          on?: string[];
        }
      | boolean;
  }
}

export default enumValues;

/**
 * Setup `modify`: a setter that unwraps a shape on write, and a post hook that
 * turns an enum path into a shape on a `lean` read
 *
 */
function modifyProperties(schema: Schema, paths: EnumPath[]): void {
  if (!paths.length) {
    return;
  }

  const options = paths[0].options;

  /**
   * Replace each enum path on a `lean` result with an object holding the
   * path's (original) value and its values (enumValues). Only that one
   * path is touched: the siblings around it are left as they are.
   *
   * The flag is read from `mongooseOptions()`. On Mongoose 8, `getOptions()`
   * has no `lean` for a `find` by the time this hook runs. Only a query can
   * be lean: a document or aggregate hook listed in `on` is left alone.
   */
  function populatePropertyFor(this: HookContext, result: unknown): void {
    if (typeof this.mongooseOptions !== 'function') {
      return;
    }
    if (!this.mongooseOptions().lean) {
      return;
    }

    resultDocuments(this, result).forEach(function (doc) {
      paths.forEach(function (path) {
        const keys = path.path.split('.');

        // Read before write: the write replaces the leaf being read.
        writeEnumShape(doc, keys, {
          values: path.enumValues.slice(),
          value: readEnumValue(doc, keys),
        });
      });
    });
  }

  /**
   * Setup handlers for modifying properties -- ['find', 'findOne']
   */
  // Non-null: filterPaths returns no paths when `modify` is unset, and this
  // function returned above in that case.
  options.modify!.on.forEach(function (on) {
    schema.post(on, populatePropertyFor);
  });

  /*
   * Writes are unwrapped by a setter, which runs before Mongoose casts the
   * value. Setters run last-added first, so this one runs before the schema's
   * own `lowercase`, `trim` and `uppercase`, which would throw on a shape.
   * That holds only for setters added before the plugin is applied: one added
   * to the path afterwards runs first, and sees the shape.
   */
  paths.forEach(function (path) {
    schema.path(path.path).set(unwrapEnumShape);
  });
}

/**
 * A non-null object that is not an array.
 */
function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A shape is a non-null, non-array object whose `values` is an array.
 */
function isEnumShape(value: unknown): value is EnumShape {
  return isObject(value) && Array.isArray(value.values);
}

/**
 * Unwrap a shape to its `value`. Anything else, which is every plain value
 * a query filter or an ordinary write carries, passes through unchanged.
 */
function unwrapEnumShape(value: unknown): unknown {
  return isEnumShape(value) ? value.value : value;
}

/**
 * Locate schema paths that are enums
 * @param
 */
function findPaths(schema: Schema, options: ResolvedOptions): EnumPath[] {
  const paths: EnumPath[] = [];

  schema.eachPath(function (
    path: string,
    type: SchemaType & { enumValues?: unknown[] },
  ) {
    if (type.enumValues && type.enumValues.length) {
      paths.push({
        path: path,
        enumValues: type.enumValues,
        options: options,
      });
    }
  });

  return filterPaths(paths, options);
}

/**
 * Filter paths based on allowed paths, which can be: string, callback or a regex
 *
 *
 */
function filterPaths(
  paths: EnumPath[],
  allowed: Filtered | undefined,
): EnumPath[] {
  if (!allowed) {
    return [];
  }
  if (!allowed.only.length) {
    return paths;
  }

  return paths.filter((path) =>
    allowed.only.some((filter) => matchesFilter(filter, path.path)),
  );
}

/**
 * Whether one filter selects a path. A predicate's own error propagates,
 * rather than being reported as a bad filter.
 */
function matchesFilter(filter: enumValues.Filterables, path: string): boolean {
  if (typeof filter === 'function') {
    return Boolean(filter(path));
  }
  if (typeof filter === 'string') {
    return path === filter;
  }
  // Duck-typed on purpose. 0.0.3 accepted anything with a `test`, and
  // `instanceof RegExp` fails for a RegExp from another realm. `null` is an
  // object too, so it is ruled out before `test` is read, and falls through
  // to the rejection below.
  if (
    filter !== null &&
    typeof filter === 'object' &&
    typeof filter.test === 'function'
  ) {
    return filter.test(path);
  }

  throw new Error(
    `${typeof filter} is not an allowed filter type. Must be String, RegExp or Function`,
  );
}

/**
 * Setup virtual properties for the document
 *
 */
function setVirtuals(schema: Schema, paths: EnumPath[]): void {
  paths.forEach((path) => {
    // Non-null: filterPaths returns no paths when `virtual` is unset.
    const props = path.options.virtual!.properties;

    if (props[path.path]) {
      schema.virtual(props[path.path]).get(function () {
        // A copy: Mongoose's enum validator reads this same array.
        return path.enumValues.slice();
      });
    }
  });
}

/**
 * Attach properties to the document
 *
 */
function attachProperties(schema: Schema, paths: EnumPath[]): void {
  paths.forEach((path) => {
    // Non-null: filterPaths returns no paths when `attach` is unset.
    const props = path.options.attach!.properties;

    if (props[path.path]) {
      (props[path.path].on || []).forEach((on) => {
        /**
         * Setup post callbacks. Each one attaches its own path alone: the
         * hooks of a property are the ones it listed in `on`, so a hook that
         * attached every path would put the others on queries they never
         * named, and would fail on a path with no property.
         */
        schema.post(on, function (this: HookContext, result: unknown): void {
          resultDocuments(this, result).forEach(function (doc) {
            doc[props[path.path].as] = path.enumValues.slice();
          });
        });
      });
    }
  });
}

/**
 * Read the value at `keys` in a lean document, looking through a shape left
 * there by an earlier pass (a hook listed twice in `modify.on`).
 *
 * On a nested path, a value that is absent or `null` reads as `null`. That
 * is what 0.0.3 gave on Mongoose 4. Mongoose 8 leaves an unset nested path
 * out of a lean result altogether, and a stored `null` parent has nothing
 * under it to read. A top-level path reads as it is stored: absent stays
 * `undefined`, and `null` stays `null`.
 */
function readEnumValue(doc: Fields, keys: string[]): unknown {
  let value: unknown = doc;

  for (const key of keys) {
    if (!isObject(value)) {
      value = undefined;
      break;
    }

    value = value[key];
  }

  if (isEnumShape(value)) {
    value = value.value;
  }

  return keys.length > 1 && (value === undefined || value === null)
    ? null
    : value;
}

/**
 * Put `insert` at `keys` in a lean document, and change nothing else. A
 * parent that is missing or `null` is given a new object, so the leaf has
 * somewhere to live. Any other parent that is not a plain object is stored
 * data, and is left as it is: the shape is not written, since replacing the
 * parent would lose that data if the document were written back.
 */
function writeEnumShape(doc: Fields, keys: string[], insert: EnumShape): void {
  let parent = doc;

  for (const key of keys.slice(0, -1)) {
    if (parent[key] === undefined || parent[key] === null) {
      parent[key] = {};
    } else if (!isObject(parent[key])) {
      return;
    }

    parent = parent[key] as Fields;
  }

  parent[keys[keys.length - 1]] = insert;
}

/**
 * Setup options and defaults
 *
 */
function setOptions(
  schema: Schema,
  input: enumValues.EnumValueOptions | undefined,
): ResolvedOptions {
  // The defaults are written onto the caller's own object, in place, as
  // 0.0.3 always did. It changes shape as they go in, which no one type
  // describes, so this function alone works on an untyped view of it. Hook
  // names in `on` are taken on trust, as Mongoose itself takes them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  const options: Record<string, any> = input || {};

  function setDefaults(array: string[]): void {
    if (!array.length) {
      if (options.find) {
        array.push('find');
      }
      if (options.findOne || !options.find) {
        array.push('findOne');
      }
    }
  }

  options.only = options.only || [];
  options.validateBeforeSave =
    options.validateBeforeSave === undefined
      ? schema.options.validateBeforeSave
      : Boolean(options.validateBeforeSave);

  ['virtual', 'attach', 'modify']
    .filter((prop) => options[prop])
    .forEach((prop) => {
      if (typeof options[prop] !== 'object') {
        options[prop] = {};
      }
      options[prop].properties = options[prop].properties || {};
      options[prop].only =
        options[prop].only || Object.keys(options[prop].properties);
    });

  if (options.modify) {
    delete options.modify.properties;
    options.modify.on = options.modify.on || [];
    setDefaults(options.modify.on);
  }
  if (options.attach) {
    Object.keys(options.attach.properties).forEach((property) => {
      options.attach.properties[property].on =
        options.attach.properties[property].on || [];
      setDefaults(options.attach.properties[property].on);
    });
  }

  return options as ResolvedOptions;
}

/**
 * The documents in a post hook's result. A query run with
 * `includeResultMetadata` resolves a wrapper, whose `value` is the document.
 * Anything that is not an object is no document at all, and is dropped: the
 * `null` of a `findOne` that matches nothing, or the number of a count.
 */
function resultDocuments(context: HookContext, result: unknown): Fields[] {
  if (
    typeof context.getOptions === 'function' &&
    context.getOptions().includeResultMetadata &&
    isObject(result)
  ) {
    result = result.value;
  }

  return (Array.isArray(result) ? result : [result]).filter(isObject);
}
