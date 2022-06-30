
function registerPlugin(data) {
	var config = data.config;
	var path = config.plugin;
    var fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
	var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
    //addOptionsToUI(manifest.options);
    var script = fs.getByPath('/'+manifest.script).text();
    var functions = {};
    functions = eval('(function() {\n'+script+'\n})();');
    // note - server will need to restart to load changes in plugin
    
	return {fs,manifest,functions};
}

module.exports = {registerPlugin};
