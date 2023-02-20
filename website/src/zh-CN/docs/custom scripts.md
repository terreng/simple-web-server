# 使用自定义脚本 <Badge type="tip" text="未完成/可能改变" vertical="top" />

## How it works

Perform a post/get request towards a js file, This js file will be checked for a key (Security) and with the correct key, the document will temporarily append the script and will execute the requested script

As a security feature, you must have the request path and a key programed in a .swsswsaccess file and in the js file.
The file name does not need to end with .js  The extension can be anything you want as the extension does not matter and will not be checked
You do not need to have swsaccess enabled, this does not enable swsaccess. It is just easier to keep everything in 1 place
It is recommended to have the log to file function on, so it is easier to see if something goes wrong

::: warning
While not required, it is very highly recomended to turn on the swsaccess feature, as it will block users from performing a get request towards the file.
:::

## Writing the swsaccess file

The file needs to be in the same path as the requested file
The file name should be .swsswsaccess (case sensitive)
Example:

For info on how to write for a get request, please read the [swsaccess readme](swsaccess.md)

```
[
    {
        "type": "POSTkey",
        "request_path": "index.js",
        "key": "wa4e76yhefy54t4a"
    }
]
```
Change `request_path` to the file you would like to perform this towards
Change `key` to a random string of numbers and letters
Do not change `type`

## Adding key verification to the .js file

Add the following line to your swsaccess file

```
postKey = 'wa4e76yhefy54t4a'
```
Change `wa4e76yhefy54t4a` to the value of the key that you had inputed into the swsaccess file
The start of the line (`postKey = `) MUST STAY THE SAME (case sensitive). The server does not check for a set variable, but it will scan the file for the text `postKey`
THIS LINE MUST BE ITS OWN LINE!! You CANNOT combine multiple lines of code with `;`
Indenting this line may cause for the server to not find this line and in result, the code will not be executed
YOU CANNOT PUT SPACES, `"`, or `'` IN YOUR KEY

the res and req variables ARE NOT WINDOW VARIABLES. DO NOT USE THEM AS SUCH

## Writing the code inside the file

Example:
```
res.contentType('text/plain') // ALWAYS set the headers first
res.write('test') // THEN send the data
res.end() // THEN end the request
```
res contains all the functions to respond, while req contains all the request information

*NOTE* - You can use BOTH server side javascript and Server Side POST in the same file! Just declare 2 seperate keys in the swsaccess and in the file!

To Debug the code, open the main window and press ctrl + shift + i


## res Commands

### `res.end()`: function
This function MUST be called at the end of the file. If called before finished processing, the server will cut off your script
This function will close the http request
You can use this function directly when finished and it will automaticaly respond with an http code of 200 (unless set otherwise)

### `res.write(data, httpCode)`: function
`data: String ||  Buffer  || ArrayBuffer`
This function will write data to the client. Once called, you canot push any more information.

### `res.setHeader(headerType, headerValue)`: function
This function will set headers of the response.
Instead of `Cookie: name=value`, you would put `res.setHeader('Cookie', 'name=value')`

### `res.contentType(type)`: function
This function will set the content type to respond with, you could also use the `res.setHeader()` function

### `res.writeCode(httpCode)`: function
Call this to respond with no message. Dont forget to finish with `res.end()`

### `res.renderFileContents(file)`: function
Once you have called the file with `res.getFile()` (DO NOT use the `file.file()` function) use `res.renderFileContents()` to render the file
DO NOT call `res.end()` when using this function
Example:
```
`res.getFile('../somefile.html', function(file) {
    if (file.error) {
        console.log('error')
    } else if (file.isFile) {
        res.renderFileContents(file)
    } else if (file.isDirectory) {
        file.getDirContents(function(results) {
            results[2].file(function(file2) {
                res.renderFileContents(file2)
            })
        }
    }
})
```

## Chunked encoding

### `res.writeChunk(data)`: function
`data: String ||  Buffer  || ArrayBuffer`
This feature will send the data in chunks, instead of all at once.
To enable, you must set the transfer-encoding header to chunked
Like this: `res.setHeader('transfer-encoding','chunked')`

Example:

```
res.setHeader('transfer-encoding','chunked')
res.contentType('text/html; charset=utf-8')
res.writeHeaders(200)
res.writeChunk('This is Chunk number 1')
res.writeChunk('\n\nAnd this is chunk number 2')
res.writeChunk('\n\nAnd this is the last chunk')
res.end() // VERY IMPORTANT (as always)
```

## req Commands

### `req.bodyparams`: If the request is made with the html `form` element, then this will have all the values of the form

### `req.headers`: json string
This contains all of the headers that the user sent when making the http request

### `req.arguments`: json string
This contains all of the arguments that the user has put in the url

### `req.method`: string
This contains the request method

### `req.uri`: string
This contains the entire requested path

### `req.origpath`: string
This contains the requested file (Will end with / if is directory)

### `req.path`: string
This contains the requested file. (Will NOT end with / if is directory)


## FileSystem

### `res.getFile(path, callback)`: function
This function will read a file. Relative urls are supported.
To get the directory contents, use the `file.getDirContents()` function
To read the file as text, use the `file.file()` function
Example: 
```
`res.getFile('../test.txt', function(file) {
    if (file.error) {
        console.log('error')
    } else if (file.isFile) {
        file.file(function(text)
            var filetext = text // file.file will read the file as text. To render the file, you can use the renderFileContents() function
        })
    } else if (file.isDirectory) {
        file.getDirContents(function(results) {
            results[2].file(function(file) {
                console.log(file)
            })
        }
    }
})
```

### `res.writeFile(path, data, allowReplaceFile, callback)`: function
This function will save a file
path: the path of the file
If the path contains a non existent folder, the folder will be created
data: string/Buffer/ArrayBuffer of the file. DO NOT SEND OTHER TYPES OF DATA - THIS COULD BREAK THE APP (Just refresh it)
allowReplaceFile: if file exists and you want to replace the file, set this to true
callback: function will be excecuted to tell you if there was an error or it will callback the file

### `res.deleteFile(path, callback)`: function
This function will delete
path: the path of the file
callback: function will be excecuted to tell you if there was an error or success


Commands once you get the info using the `res.getFile()` function

### `entry.file(callback)`
promise: `entry.filePromise()`
This function will read the file and return the contents as a Buffer.
If you want to display the contents of the file, it is recommended to use `res.renderFileContents()`
This function will only work on files, not directories

### `entry.text(callback)`
promise: `entry.textPromise()`
Will read the file as text

### `entry.remove(callback)`
promise: `entry.removePromise()`
Use this to delete the file

### `entry.getDirContents(callback)`
promise: `entry.getDirContentsPromise()`
This function will get the contents of the directory in an array. Every file in the array will work with the `.file` and the `.getDirContents` functions
This function will only work on directories, not files
From here, you can use the contents to use in the rest of the processing.

If you would like to render the directory listing with the results, you can use these commands.
When the directory listing is sent, you still need to send `res.end()`

### `res.renderDirectoryListingJSON(results)`
Will send a stringified json of the directory listing

### `res.renderDirectoryListingStaticJs(results)`
Will send a directory listing that can transition between javascript and static

### `res.renderDirectoryListingTemplate(results)`
Will send a the default javascript directory listing

### `res.renderDirectoryListing(results)`
Will send a plain, static directory listing

## Promise based fs functions

Same use as functions above, just uses promises to use await or .then when reading the file.

`res.getFilePromise(path)`

`res.writeFilePromise(path, data, allowReplaceFile)`

`res.deleteFilePromise(path)`


## Processing the request body

### `res.readBody(callback)`
callback: function

Will read from the req stream. If the body has already been read, it will return the existing body
After calling this, `req.body` will be set

Example:

```
res.readBody(function(body) {
    console.log(body)
})
```

### `res.readBodyPromise()`

Same as `res.readBody`, but uses promises

Examples:

```
// When inside an async function
var body = await res.readBodyPromise()
console.log(body)
// or
res.readBodyPromise().then(function(body) {
    console.log(body)
})
```

### `stream2File(writePath, allowOverWrite, callback)`
`writePath`: path to save file to
`allowOverWrite`: allow file overwrite, `true` or `false`
`callback`: function. Will return if there is an error, or success

stream request body to file. Saves memory on larger requests


## Requiring modules

First, you MUST require a file through the `requireFile` function.
In the folder that has the module you required, you can open a terminal/command prompt window and install the modules you want.
Then, inside the file you required, you can require the modules you installed

You CANNOT require modules inside the main file
the `requireFile` function is only for use in the main file

To clear module cache: call the `clearModuleCache` function



## Another Useful Tool

`global.tempData`: json This global variable is a place that you can store data if you need. It will NOT be cleared after the end of the response.

The `appInfo` variable will tell you which server you are using
