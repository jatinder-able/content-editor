/* // toECML
//     1. For each stage
//         1. for each plugin
            1. generate ecml
            2. add media to manifest
            3. add plugin to plugins used
        2. generate ecml
        3. add media to manifest
        4. add thumbnail
// 2. ManifestGenerator - generate plugin and media manifest using pluginsUsed array
// 3. Merge the media manifest generated by stages with the media manifest generated by the manifest generator
// 4. If there is migrated media - merge the migrated media with manifest media

// Pre-condition. toECML would generate the pluginUsed array
*/

var _PM_ = org.ekstep.pluginframework.pluginManager
window.ManifestGenerator = new (Class.extend({
	visitedPlugins: {},
	pluginManifest: [],
	mediaManifest: [],
	compatibilityVersion: 0,
	reset: function () {
		this.visitedPlugins = {}
		this.pluginManifest = []
		this.mediaManifest = []
	},
	getPluginManifest: function () {
		return this.pluginManifest
	},
	getMediaManifest: function () {
		return this.mediaManifest
	},
	isVisited: function (pluginId) {
		return !!this.visitedPlugins[pluginId]
	},
	visit: function (pluginId) {
		this.visitedPlugins[pluginId] = true
	},
	generate: function (pluginUsedArray) {
		this.reset()
		this._generate(pluginUsedArray)
	},
	_generate: function (pluginArray) {
		var instance = this
		_.forEach(pluginArray, function (pluginId) {
			instance._generateManifest(pluginId)
		})
	},
	_generateManifest: function (pluginId) {
		if (!this.isVisited(pluginId)) {
			this.visit(pluginId)
			var manifest = _PM_.getPluginManifest(pluginId)
			if (!_.isUndefined(manifest)) {
				this._generatePluginManifest(manifest)
				this._generateMediaManifest(manifest)
			}
		}
	},
	_getDependencies: function (pluginManifest) {
		var depends
		if (pluginManifest.dependencies && pluginManifest.dependencies.length > 0) {
			var dependencies = _.map(_.filter(pluginManifest.dependencies, function (dependency) {
				return ['all', 'renderer'].indexOf(dependency.scope) !== -1
			}), function (dep) { return dep.plugin })
			if (dependencies.length > 0) {
				depends = dependencies
			}
		}
		return depends
	},
	_generatePluginManifest: function (manifest) {
		var depends = this._getDependencies(manifest)
		var dependsStr = ''
		if (!_.isUndefined(depends) && depends.length > 0) {
			this._generate(depends)
			dependsStr = depends.join(',')
		}
		manifest.type = manifest.type || 'plugin'
		if (manifest.renderer) this.pluginManifest.push({id: manifest.id, ver: manifest.ver, type: manifest.type, depends: dependsStr})
	},
	_generateMediaManifest: function (manifest) {
		var instance = this
		if (manifest.renderer) {
			if (manifest.renderer.compatibilityVersion && (manifest.renderer.compatibilityVersion > instance.compatibilityVersion)) instance.compatibilityVersion = manifest.renderer.compatibilityVersion

			// Add js/css/custom plugin dependencies
			if (manifest.renderer.dependencies && manifest.renderer.dependencies.length > 0) {
				_.forEach(manifest.renderer.dependencies, function (dependency) {
					instance.mediaManifest.push({
						id: dependency.id || UUID(),
						plugin: manifest.id,
						ver: manifest.ver,
						src: _PM_.resolvePluginResource(manifest.id, manifest.ver, dependency.src),
						type: dependency.type
					})
				})
			}
			// Add main renderer script file
			if (manifest.renderer.main) {
				instance.mediaManifest.push({
					id: manifest.id,
					plugin: manifest.id,
					ver: manifest.ver,
					src: _PM_.resolvePluginResource(manifest.id, manifest.ver, manifest.renderer.main),
					type: 'plugin'
				})
			}
			// Add the manifest.json of the renderer plugin
			instance.mediaManifest.push({
				id: manifest.id + '_manifest',
				plugin: manifest.id,
				ver: manifest.ver,
				src: _PM_.resolvePluginResource(manifest.id, manifest.ver, 'manifest.json'),
				type: 'json'
			})
		}
	},
	getCompatibilityVersion: function () {
		if (this.compatibilityVersion) return this.compatibilityVersion
	}
}))()
