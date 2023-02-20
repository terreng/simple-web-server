# 插件脚本

# 此页未完成。 See [issue #119](https://github.com/terreng/simple-web-server/issues/119)

Make sure to cover:

How to access plugin options (and mention that all options are optional and not validated at all. Types might not necessarily match what is specified in the manifest, and options could be undefined. No guarantees.)

How to access server options

Both onStart and onRequest are optional

hat you can do with server, and examples of modifying it

How to throw errors

How preventDefault works 

What you can do with res and req, and common examples such as getting the request path, setting headers, getting cookies, and editing page content

Add a few example scripts for common use cases:
- Adding a custom header
- Creating a 301/302 redirect from one directory to another, preserving query parameters
- Creating a _rewrite_ from one directory to another
- Modifying the contents of the returned file if it's an html file, such as injecting a script tag, or replacing `Copyright [YEAR]` with the current year
- Requiring http authentication for only a specific directory or file

How to include/require other files.