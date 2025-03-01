const isUserModel = require('./is-user-model')

const getFilepathForModelByType = ({ type, model }) => {
  if (isUserModel(model)) {
    const parts = model.split(/\//)
    const filename = parts[parts.length - 1]

    switch (type) {
      case 'character':
        return `/data/user/characters/${filename}`
      case 'object':
        return `/data/user/objects/${filename}`
      case 'environment':
        return `/data/user/environments/${filename}`
      default:
        return null
    }
  } else {
    switch (type) {
      case 'character':
        return `/data/system/dummies/gltf/${model}-lod.glb`
      case 'object':
        return `/data/system/objects/${model}.glb`
      default:
        return null
    }
  }
}

module.exports = getFilepathForModelByType
