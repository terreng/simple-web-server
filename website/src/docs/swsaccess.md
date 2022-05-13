# Advanced configuration using .swshtaccess files <Badge type="tip" text="Unfinished / May change" vertical="top" />

Simple Web Server does not have support for .htaccess files. Instead, we support custom .swshtaccess files, which offer a subset of the features of .htaccess files.

## How to

All Htaccess features are built to have 100% compatibility with changes in settings
## Currently supported
301 - Moved Permanently. Tells the server that when chosen file is requested to move to a different directory or file. The browser will cache this
302 - Found. Tells the server that when chosen file is requested to move to a different directory or file. Not cached by the browser
307 - Temporary Redirect. Tells the server that when chosen file is requested to move to a different directory or file. Not cached by the browser.
401 - Unauthorized. The page will require login. For some reason, I cannot find how to clear the cache of the authorization header, which means that once you type it in, the browser will not ask for a login, unless you have multiple password protected pages with different passwords, The authentication header will change whenever you enter a different password.
403 - blocks any request to the file
denyDirectAccess - This will deny direct access to image/video/audio files. This option only works if https is enabled or if the user is on a localhost address.
Render Directory Listing - Ignores the value of 404 instead of directory listing and renders the directory listing
Deny deleting for a specific file or directory - Ignores value of delete option and will deny delete to requested file
Allow deleting for certian file - Ignores value of delete option and will allow deleting requested file
Deny uploading for a specific file or directory - Ignores value of PUT option and will deny put to requested file
Allow uploading for certian file - Ignores value of PUT option and will allow deleting requested file.
send directory contents - Will send the current directory at the end of the file. See the How To for a more advanced description
additional header - Will set an additional header
Versioning - relative file hosting
serverSideJavaScript - Just what it sounds like
If you want more features - Make an issue!

## Making the file
A .swshtaccess file is actually a javascript array, which means one problem with the file will cause it not to work - So be careful. No additional info can be put into the file
Note - If you are trying to redirect to some index.html file and you have the option to automatically show index.html turned on, your path will go from '/somepath/index.html' to '/somepath/'
Note - If you are trying to redirect to some .html file and you have the option to remove .html extension turned on, leave the .html extension. The web server will handle the request and forward it to have no .html extension

Note - when selecting the file to scan for, if you are trying to edit some index.html (or index.htm, or index.xhtml, or index.xhtm) Put the file name in place of request path. example: `"request_path": "index.html",`. Security will scan any way to get the the file

Note - when selecting the file to scan, if the file is some .html and you have the option to remove the .html extension turned on, leave the .html extension. The Web Server is programed to handle the request!

Note - To set more than 1 ruleset per file, see instruction at bottom of the page

Note - 401 (unauthorized) username and passwords are CASE SENSITIVE!!
Note - .swshtaccess file MUST be in the same directory as the file you want to change. The file does not need to exist (Mainly for 301, 302, and 307).

::: Important Note
Everything in the file, including the file name, is case sensitive.
:::

To use option for all files, the value of request path will be 'all files' It should look like this `"request_path": "all files",`

## 301 Example
Tells the server that when chosen file is requested to move to a different directory or file. The browser will cache this

```
[
    {
        "request_path": "name of file you want to modify",
        "type": 301, 
        "redirto": "/path/you/want/to/redirect/to"
    }
]
```

## 302 Example
Tells the server that when chosen file is requested to move to a different directory or file. Not cached by the browser

```
[
    {
        "request_path": "name of file you want to modify",
        "type": 302, 
        "redirto": "/path/you/want/to/redirect/to"
    }
]
```

## 307 Example
Tells the server that when chosen file is requested to move to a different directory or file. Not cached by the browser.

```
[
    {
        "request_path": "name of file you want to modify",
        "type": 307, 
        "redirto": "/path/you/want/to/redirect/to"
    }
]
```

## 401 Example
The page will require login.

```
[
    {
        "request_path": "name of file you want to modify",
        "type": 401,
        "username": "test",
        "password": "example"
    }
]
```

## denyDirectAccess Example
This will deny direct access to image/video/audio files. This option only works if https is enabled or if the user is on a localhost address.

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "denyDirectAccess"
    }
]
```

## Directory Listing
Ignores the value of 404 instead of directory listing and renders the directory listing

```
[
    {
        "type": "directory listing"
    }
]
```

## Deny uploading
Ignores value of PUT option and will deny put to requested file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "deny put"
    }
]
```

## Deny delete
Ignores value of delete option and will deny delete to requested file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "deny delete"
    }
]
```

## Allow Uploading
Ignores value of PUT option and will allow deleting requested file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "allow put"
    }
]
```

## Allow delete
Ignores value of delete option and will allow deleting requested file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "allow delete"
    }
]
```

## 403 - Block File
Just blocks the file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": 403
    }
]
```

## Versioning
Versions of a file

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "versioning",
        "default": 4,
        "variable": "v",
        "version_data": {"1": "Path to file",
                         "2": "Path to file",
                         "3": "Path to file",
                         "4": "Path to file"
                        }
    }
]
```
Example of request path

```
{
    "1": "/data/path/to/file/index.html"
}
```
or, if the you were in the `/data/asd/` directory

```
{
    "1": "../path/to/file/index.html"
}
```
You can add as many versions as you would like.
I have recently made it to where you can use relative paths!
Versioning pretty much just makes the server think that you requested another file. So you can do a directory or whatever! The file will be checked with the htaccess of that current directory

The variable is what the user needs to request. If we use v, the user would request something like `localhost:8887/example.mp4?v=1`
Note that you do not need an extension for the requested file.

## additional header
Sends an additional header

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "additional header",
        "headerType": "the type of header",
        "headerValue": "the value of the header"
    }
]
```
If you go to a site (Like <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers">Mozilla</a>) it will show the header as

`Cookie: name=value`. The first part of the header (In this case, `Cookie`) will be the `headerType` and the second part of the header (In this case, `name=value`) will be the `headerValue`.
The end result will be
```
[
    {
        "request_path": "name of file you want to modify",
        "type": "additional header",
        "headerType": "Cookie",
        "headerValue": "name=value"
    }
]
```

## send directory contents
Will send the current directory along with the file
Example:

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "send directory contents",
        "dir_to_send": "../somepath/"
    }
]
```
More howto (send directory contents)

This feature CANNOT use the `all files` value for the `request_path` field. You must specify each file separately
if dir_to_send is not specified, then the current directory will be sent
Getting info from sent contents
This is what is sent

```
<script>addRow("index.html", "index.html", false, 6276, "6.1 KiB", 302113940, "5/25/21, 1:09:40 PM")</script>
```
It will send as an addRow function. The contents are, as follows.

`addRow(filename, filenameencoded, isdirectory, size, sizestr, date, datestr)`


`filename`: The raw file name.
`filenameencoded`: The encoded file name (For things like setting link locations)
`isdirectory`: If the sent row is a directory, this will be true. Will send as `true` or `false`
`size`: File size (in Bytes) Example: `254014`
`sizestr`: File size (As a string) Example: `248.1 KiB`
`date`: Date not in a string format. Example: `142132146`
`datestr`: Date as a string. Example: `3/11/21, 3:21:46 AM`

## serverSideJavaScript
Allows you to process and respond as you wish
Example:

```
[
    {
        "request_path": "name of file you want to modify",
        "type": "serverSideJavaScript",
        "key": "ATonOfRaNdOmNumbersAndLetters"
    }
]
```
Please refer to the <a href='custom scripts.md'>custom scripts readme</a> To learn how to respond.

The only difference is - DO NOT declare the type as postKey in the htaccess file and instead of using `postKey = 'wa4e76yhefy54t4a'` use `SSJSKey = 'wa4e76yhefy54t4a'`

## How to use more than 1 ruleset per file
Pay VERY close attention to the syntax. One thing wrong will cause an error!!
First, I provide an example

```
[
    {
        "request_path": "oranges.html",
        "type": 401,
        "username": "Username",
        "password": "Password"
    },
    {
        "type": "directory listing"
    },
    {
        "request_path": "all files",
        "type": "deny delete"
    }
]
```

You basically have `[` and `]` surrounding the entire file and each ruleset inside `{` these `}`
You MUST separate each ruleset with a comma (As shown in the example). The failure to do so will result in an error.
For the last ruleset, no comma can be after the `}`. This will break the array and give you an error.

When using multiple rulesets per file, the server will first check if an authentication rule is in place. If it is, the server will require the user to enter the password before it will allow the user to do anything. After the user has correct auth (if the auth is present) it will check for rulesets from the top of the file, to the bottom. The redirects, the directory listing, and sending the current directory with the file cannot both be used, whatever the web server picks up first is what will be executed.

You can have as many additional headers as you like!



