# 插件清单文件

每个插件都有一个清单文件`plugin.json`。该文件指定了插件的名称、唯一id、可配置选项以及运行的脚本。

选项以JSON格式存储。下面是一个示例`plugin.json`文件，后面是属性（键）列表以及您为每个属性提供的值。

## plugin.json 文件示例

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

这是该示例插件的选项在应用程序中的样子:

<figure>
  <img src='/images/plugin_options.jpeg' style='width: 350px'>
  <figcaption>服务器的插件选项。复选框、文本框、数字输入和下拉列表。</figcaption>
</figure>

## 属性

### `id`
- 必需的
- 类型: `string`，只能包含字母（大写或小写）、数字、 `-`和`_`

插件的id。你应该确保这是唯一的。安装与已安装插件id相同的插件将替换现有插件。

### `name`
- 必需的
- 类型: `string`，不超过64个字符

插件的名称。

### `script`
- 必需的
- 类型: `string`，文件路径

插件脚本文件的名称。 参见 [插件脚本](plugin%20script.md).

### `options`
- 可选的
- 类型: `array`数组

插件的可配置选项列表，将显示在应用程序中。选项按数组顺序显示。

每个选项都是数组中的一个对象。下面是每个选项对象的属性(键)和相应值的列表:

> #### `id`
> - 必需的
> - 类型: string, 只能包含字母（大写或小写）、数字、`-`和`_`，必须是唯一的
> 
> 选项的ID。每个选项必须具有唯一的ID。
> 
> #### `name`
> - 必需的
> - 类型: string, 不超过64个字符
> 
> 选项的名称。
> 
> #### `description`
> - 可选的
> - 类型: string, HTML
> 
> 选项作用的描述。可以包含HTML格式，例如链接。确保将`<`转义为`&lt;`;`>`转义为`&gt;`。
> 
> #### `type`
> - 必需的
> - 类型: string: `bool`, `string`, `number`, 或者 `select`
> 
> 选项的类型。
> 
> - `bool`: 复选框 (`true` 或 `false`)
> - `string`: 文本框 (string)
> - `number`: 数字 输入 (number, 整数)
> - `select`: 下拉列表 (string,选定选项的ID)
> 
> #### `default`
> - 必需的
> - 类型: 取决于 `type`:
>   - 如果`type`是`bool`，那么它必须是布尔值（`true`或`false`）。
>   - 如果`type`是 `string`，则必须是字符串。要使文本框开始为空，请将其设置为空字符串(`""`)。
>   - 如果`type`是`number`，则这必须是一个数字。
>   - 如果`type`是`select`，则必须是一个字符串（其中一个选项的id）。
> 
> 该选项的默认值。
> 
> #### `min` 和 `max`
> - 可选的. 仅当 `type`为`number`时使用。
> - 类型: `number`
> 
> 选项的最小值或最大值。未以任何方式验证。 没有以任何方式校验。
> 
> #### `choices`
> - Required if `type` is `select`.
> - 类型: `array`数组
> 
> 下拉列表的选项。选项按数组顺序显示。
> 
> 每个选项都是数组中的一个对象。下面是财产（键）列表以及您应该为每个选择对象提供的相应值:
> 
>> ##### `id`
>> - 必需的
>> - 类型: string, 只能包含字母（大写或小写），数字， `-`，和 `_`, 不能是 `enabled`，必须是唯一的
>> 
>> 列表中选项的ID。每个选项都必须具有唯一的ID。
>> 
>> ##### `name`
>> - 必需的
>> - 类型: string, 不超过512个字符
>> 
>> 列表中选项的名称