# Plugin manifest file

Every plugin has a manifest file, `plugin.json`. This file specifies things like the name of the plugin, a unique id, the configurable options it has, and the script it runs.

Options are stored in JSON format. Below is an example `plugin.json` file followed by a list of properties (keys) and the value you should provide for each.

## Example plugin.json file

```json
{
  "id": "my_example",
  "name": "Example Plugin",
  "script": "script.js",
  "options": [
    {
      "id": "my_checkbox",
      "name": "Example checkbox",
      "description": "Enable if you like checkboxes.",
      "type": "bool",
      "default": false
    },
    {
      "id": "my_textbox",
      "name": "Example textbox",
      "description": "Enter your favorite word.",
      "type": "string",
      "default": ""
    },
    {
      "id": "my_number",
      "name": "Example number input",
      "description": "Specify your favorite number.",
      "type": "number",
      "default": 50,
      "min": 0,
      "max": 100
    },
    {
      "id": "my_dropdown",
      "name": "Example dropdown",
      "description": "Choose your preferred color.",
      "type": "select",
      "default": "red",
      "choices": [
        { "id": "red", "name": "Red" },
        { "id": "yellow", "name": "Yellow" },
        { "id": "green", "name": "Green" },
        { "id": "blue", "name": "Blue" }
      ]
    }
  ]
}
```

Here's what the options for this example plugin look like in the app:

<figure>
  <img src='/images/plugin_options.jpeg' style='width: 350px'>
  <figcaption>Plugin options for a server. A checkbox, textbox, number input, and dropdown.</figcaption>
</figure>

## Properties

### `id`
- Required
- Type: string, can only contain letters (uppercase or lowercase), numbers, `-`, and `_`

The unique id of the plugin. You should make sure this is unique. Installing a plugin with the same id as an already installed plugin will replace the existing plugin.

### `name`
- Required
- Type: string, no more than 64 characters

The name of the plugin.

### `script`
- Required
- Type: string, file path

The name of the plugin script file. See [Plugin script](plugin%20script.md).

### `options`
- Optional
- Type: array of objects

A list of configurable options for the plugin, which will be displayed in the app. Options are shown in the order of the array.

Each option is an object in the array. What follows is a list of properties (keys) and the corresponding value you should provide for each option object:

#### `id`
- Required
- Type: string, can only contain letters (uppercase or lowercase), numbers, `-`, and `_`, must be unique

The id of the option. Each option must have a unique id.

#### `name`
- Required
- Type: string, no more than 64 characters

The name of the option.

#### `description`
- Optional
- Type: string, HTML

A description of what the option does. You can include HTML formatting, such as links. Make sure to escape `<` as `&lt;` and `>` as `&gt;`.

#### `type`
- Required
- Type: string: `bool`, `string`, `number`, or `select`

The type of option.

- `bool`: checkbox (`true` or `false`)
- `string`: textbox (string)
- `number`: number input (number, integer)
- `select`: dropdown (string, id of selected option)

#### `default`
- Required
- Type: Depends on `type`:
  - If `type` is `bool`, then this must be a boolean (either `true` or `false`).
  - If `type` is `string`, then this must be a string. To make the textbox start blank, set this to the empty string (`""`).
  - If `type` is `number`, then this must be a number.
  - If `type` is `select`, then this must be a string (the id of one of the choices).

The default value for the option.

#### `min` and `max`
- Optional. Only used if `type` is `number`.
- Type: number

The minimum or maximum value for the option. Not validated in any way.

#### `choices`
- Required if `type` is `select`.
- Type: array of objects

A list of choices for the option. Choices are shown in the order of the array.

Each choice is an object in the array. What follows is a list of properties (keys) and the corresponding value you should provide for each choice object:

##### `id`
- Required
- Type: string, can only contain letters (uppercase or lowercase), numbers, `-`, and `_`, cannot be `enabled`, must be unique

The id of the option choice. Each choice must have a unique id.

##### `name`
- Required
- Type: string, no more than 512 characters

The name of the option choice.