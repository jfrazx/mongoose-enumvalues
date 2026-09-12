# Phase 0 baseline

Measured on the unmodified 2017 source (`index.js` untouched) against
Mongoose 8.24.4 and Vitest 4.1.11, on 2026-09-11, Node v24.14.1, arm64 macOS.

This is the reference #14 and #15 are measured against:

- #14 changes packaging only — these results must not move.
- #15 makes the red green, or justifies it in writing.

## Result

`npm test` runs to completion for the first time since 2017.
**12 passed, 1 failed, 13 total.** Stable across three consecutive runs.

> **Amended in #13 (Phase 1).** This result is unchanged under **Vitest 5.0.0**
> — same count, same test, same assertion, stable across three further runs —
> and unchanged again after Prettier reformatted the tree. Coverage also holds
> at **94.87% statements** on `index.js`.
>
> The one red is now marked **`it.fails()`** (D11), so `npm test` exits `0`
> while the test still executes and still asserts. Verified both directions:
> making the assertion pass turns the suite red with exit `1`, which is the
> signal #15 should expect when it fixes the behaviour. The marker sits at
> `test/modify_spec.js` and is removed as part of that fix.

## Per-test

| #   | File         | Test                                                 | Result   | Cause if red                                                              |
| --- | ------------ | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| 1   | virtual_spec | should create virtual property "speciesOptions"      | pass     |                                                                           |
| 2   | virtual_spec | should NOT create virtual property "numberOfLegs"    | pass     |                                                                           |
| 3   | virtual_spec | should be an array of values                         | pass     |                                                                           |
| 4   | attach_spec  | findeOne should attach enumValues as object property | pass     |                                                                           |
| 5   | attach_spec  | find should attach enumValues to all objects         | pass     |                                                                           |
| 6   | attach_spec  | genders should include ["MALE", "FEMALE"]            | pass     |                                                                           |
| 7   | modify_spec  | should NOT modify the property                       | pass     |                                                                           |
| 8   | modify_spec  | should modify property when `lean()` is used         | pass     |                                                                           |
| 9   | modify_spec  | should reset value on update                         | pass     |                                                                           |
| 10  | modify_spec  | should update other values normally                  | pass     |                                                                           |
| 11  | modify_spec  | should update enum                                   | pass     |                                                                           |
| 12  | modify_spec  | should process nested enums                          | **FAIL** | Unset nested paths are no longer materialized in lean results — see below |
| 13  | modify_spec  | should find by id and modify                         | pass     |                                                                           |

The failure is independent, not a cascade: it is the first assertion in its
test, and the tests before it all pass.

## The one failure, in detail

```
AssertionError: expected undefined to be null
 ❯ test/modify_spec.js:68
     expect(role.nesting.something.value).to.be.null;
```

**Cause — a Mongoose 4 → 8 behavior change, not the one the roadmap predicted.**

The `Role` fixture is created with only `role: 'moderator'`, so `nesting.something`
is never assigned. Confirmed against the raw driver, bypassing all plugin hooks:

```
RAW in mongo          : {"_id":"...","role":"moderator","priority":2,"__v":0}
lean BEFORE any update: {"something":{"values":["wicked","this","way","comes"]}}
```

Mongoose 4 materialized unset nested paths in `lean()` results, so the plugin
received `{ something: null }`. `determineValue` (`index.js:267-280`) hit
`null.value`, threw, and its `catch` returned `null` — which is what the test
asserts.

Mongoose 8 omits the unset path entirely. `determineValue` now receives
`undefined`, throws on `undefined['something']`, and its `catch` returns
`undefined`. The assertion wants `null`.

So the plugin's behavior is unchanged; what changed is what Mongoose hands it.
The `catch`-and-return-input idiom in `determineValue` silently converts a
structural difference into a value difference.

A side effect worth noting for #15: replaying test 9's `$set` writes an empty
`nesting: {}` object into the document, because `nest()` wraps an `undefined`
value. Harmless here, but it means the plugin writes a key that was never set.

**This was not the predicted failure.** The roadmap expected `modify`'s update
paths to go red because `pre('update')` (`index.js:155`) hooks a method Mongoose 7
removed. That hook is indeed dead — it registers without error and never fires —
but no test depends on it: tests 9, 11 and 12 route through `findOneAndUpdate`,
whose hook is still live, and test 10 uses `$inc`, which `reformatUpdateProperty`
skips anyway because it only reads `this._update['$set']` (`index.js:103`).

## Changes made to the tests during the port

| Change                                             | Reason                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `done()` → `async`/`await`, all 13 tests           | Vitest rejects `done()`: "done() callback is deprecated, use promise instead" |
| `before` → `beforeAll`                             | Vitest naming                                                                 |
| `chai` require lines removed                       | Vitest bundles chai; every assertion is unchanged                             |
| `role.update()` → `role.updateOne()` (modify_spec) | `Document.prototype.update()` removed in Mongoose 7                           |

No assertion was changed, added, or removed. `index.js` and `test/models/*.js`
are byte-identical to the 2017 source.

> **No longer true as of #13 (Phase 1).** Prettier reformatted the whole tree,
> including `index.js` and `test/models/*.js`. The change is whitespace only —
> `git diff -w --ignore-blank-lines` over `index.js` shows nothing but expanded
> single-line blocks, wrapped argument lists, and removed redundant parentheses
> — and the suite result above is unchanged across it. The _behaviour_ baseline
> this document records still stands; only the byte-level claim does not.

## Observations carried into #15

> **Line numbers below predate #13's Prettier reformat and no longer resolve.**
> The code is unchanged — only its formatting — but every anchor moved. Current
> locations:
>
> | Observation                             | Cited as  | Now at                                                      |
> | --------------------------------------- | --------- | ----------------------------------------------------------- |
> | `pre('update')` registration            | `155`     | `167-168`, inside the `['update', 'findOneAndUpdate']` loop |
> | `this._mongooseOptions.lean`            | `78`      | `79`                                                        |
> | inner `paths.forEach` shadowing `path`  | `249`     | `264`                                                       |
> | `filterPaths` rethrowing everything     | `187-215` | from `197`                                                  |
> | `determineValue` swallowing all errors  | `267-280` | from `282`                                                  |
> | `nest()` mutating via `array.reverse()` | `289`     | `306`                                                       |
> | `next()`-style pre hooks                | `102-141` | from `105`                                                  |
>
> Coverage's uncovered-line list moved with them: `89,116,137,199,205-208`
> became `91,122,145,212,218-221`.

Found while measuring. None are test failures; all are latent.

- **`index.js:155`** registers `pre('update')`. Mongoose 7 removed that method.
  Verified: the hook registers without throwing on Mongoose 8 and never fires.
  Dead code, not a live failure.
- **`index.js:78`** reads the private `this._mongooseOptions.lean`. The correct
  public replacement is **`this.mongooseOptions().lean`** — verified to return
  `true` after `.lean()`. Note that `this.getOptions().lean` returns `undefined`
  and would silently disable the entire modify read path. The roadmap's
  prescribed substitution is wrong; do not apply it.
- **`index.js:249`** — the inner `paths.forEach(function(path))` shadows the
  outer `path`, so every attached property receives the _last_ path's
  `enumValues`. Both fixtures define exactly one attach property, so the bug is
  invisible to this suite. It needs a test in #15, not just a fix.
- **`index.js:267-280`** — `determineValue` catches every error and returns its
  input. That is what turned a Mongoose structural change into test 12's
  `undefined`/`null` mismatch, and it will mask future ones.
- **`index.js:289`** — `nest()` calls `array.reverse()`, mutating its argument
  in place.
- **`index.js:187-215`** — `filterPaths` rethrows every error as "not an allowed
  filter type", including errors that have nothing to do with filter types.
- **`index.js:102-141`** use `next()`-style pre hooks. Valid on Mongoose 8;
  Mongoose 9 removed `next()` support in `pre()`. This suite does not yet run
  against 9 — that leg arrives in #13.
