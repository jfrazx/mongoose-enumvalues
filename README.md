
# EnumValues

Mongoose plugin that allows easy access to enum values. You can create virtuals, attach to your document, or modify your enum property in-place. Now with a TypeScript definition.


## Installation

```bash
npm install [--save] mongoose-enumvalues
```

## Examples
### Setup

```javascript
const mongoose   = require('mongoose');
const enumValues = require('mongoose-enumvalues');
const { Schema } = mongoose;
const UserSchema = new Schema({
  name: String,
  age: Number,
  role: {
    type: String,
    enum: ['admin', 'moderator', 'guest'],
    default: 'guest'
  },
  gender: {
    type: String,
    uppercase: true,
    enum: ['MALE', 'FEMALE'],
    default: 'FEMALE'
  },
  nesting: {
    enums: {
      type: String,
      enum: ['something', 'wicked', 'this', 'way', 'comes']
    }
  }
});

// specifics for each method below
const enumOptions = {};

UserSchema.plugin(enumValues, enumOptions);

module.exports = mongoose.model('User', UserSchema);
```

## Virtuals
  Automatically create virtual properties for enum value access.

```javascript
const enumOptions = {
  virtual: {
    only: ['gender', 'role'],
    properties: {
      gender: 'genders',
      role: 'roleValues'
    }
  }
};

//...
user.genders
=> ['MALE', 'FEMALE']

user.roleValues
=> ['admin', 'moderator', 'guest']
```


## Attach
  Simply attach enum values to your documents, restricting which paths are included,    
  and which methods hooked: ['find', 'findOne']

```javascript
const enumOptions = {
  find: true,
  findOne: true,
  attach: {
  //only: ['gender', 'role'], if omitted, determines properties via keys
    properties: {
      gender: {
        as: 'genderOptions',
        only: ['findOne'] // restricts attaching to 'findOne' method
      },
      role: { // will be attached on 'find' and 'findOne'
        as: 'roles'
      }
    }
  }
};

//...
user.genderOptions
=> ['MALE', 'FEMALE']

user.roles
=> ['admin', 'moderator', 'guest']
```

## Modify
  This option directly modifies the enum property to be an object, including the original value and the array of enum options.    
  In order for this to work correctly, `lean()` must be called.

```javascript
const enumOptions = {
  find: true,
  findOne: true
  modify: true
};

user.gender
=> {
  values: ['MALE', 'FEMALE'],
  value: 'MALE'
}

user.role
=> {
  values: ['admin', 'moderator', 'guest'],
  value: 'guest'
}

user.nesting
=> {
  enums: {
    values: ['something', 'wicked', 'this', 'way', 'comes'],
    value: null
  }
}

// You may set modified values as such
user.nesting.enums = 'wicked';

// or
user.nesting.enums.value = 'wicked';



// Alternatively you may restrict the paths and the methods

const enumOptions = {
  modify: {
    only: ['role'],
    on: ['findOne']
  }
}
```

## Caveats
  `Model.update` bypasses any validations and middleware. Utilizing this method with `modify` will produce undesired results.    
  Due to the nature of Mongoose objects, `modify` must be used in conjunction with `lean()`.    
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Example: `User.findOne({ username }).lean().then()...`
