const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const buildSquareRoom = require('./build-square-room')
const onlyOfTypes = require('./only-of-types')

require('three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)

objLoader.setLogging(false, false)

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  skinning: true,
  shininess: 0,
  flatShading: false
})

const useGround = (world, scene) => {
  const [loaded, setLoaded] = useState(false)

  const object = useRef(null)
  const groundTexture = useRef(null)

  const load = () => imageLoader.load(
    'data/shot-generator/grid_floor.png',
    image => {
      groundTexture.current = new THREE.Texture()
      groundTexture.current.image = image
      groundTexture.current.needsUpdate = true
      setLoaded(true)
    }
  )

  const groundFactory = ({ texture }) => {
    let material = new THREE.MeshToonMaterial({ map: texture, side: THREE.FrontSide })
    // material.transparent = true
    // material.blending = THREE.MultiplyBlending
    material.opacity = 1

    let geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
    let object = new THREE.Mesh( geometry, material )
    object.userData.type = 'ground'
    object.rotation.x = -Math.PI / 2
    // shift slightly to allow for OutlineEffect
    object.position.y = -0.03
    // object.renderOrder = 0.7
    return object
  }

  useEffect(() => {
    if (world.ground) {
      if (!loaded) {
        load()
      } else {
        object.current = groundFactory({ texture: groundTexture.current })
        object.current.visible = world.ground
        object.current.layers.disable(0)
        object.current.layers.enable(1)
        object.current.layers.disable(2)
        object.current.layers.enable(3)
        scene.add(object.current)
      }
    }

    return function cleanup () {
      scene.remove(object.current)
    }
  }, [world.ground, loaded])

  useEffect(() => {
    // automatically hide ground if room is visible
    if (object.current) {
      if (world.room.visible) {
        object.current.visible = false
        object.current.material.visible = false
      } else {
        object.current.visible = world.ground
        object.current.material.visible = world.ground
      }
    }
  })

  return object.current
}

const useRoom = (world, scene) => {
  const [loaded, setLoaded] = useState(false)

  const object = useRef(null)
  const walls = useRef(null)
  const wallTexture = useRef(null)

  const load = () => imageLoader.load(
    'data/shot-generator/grid_wall2.png',
    image => {
      wallTexture.current = new THREE.Texture()

      wallTexture.current.image = image
      wallTexture.current.wrapS = wallTexture.current.wrapT = THREE.RepeatWrapping
      wallTexture.current.offset.set( 0, 0 )
      wallTexture.current.repeat.set( 4.5, 4.5 )
      wallTexture.current.needsUpdate = true

      setLoaded(true)
    }
  )

  const roomFactory = ({ width, length, height, texture }) => {
    let object = buildSquareRoom(
      width,
      length,
      height,
      { textures: { wall: texture } }
    )
    // shift slightly to allow for OutlineEffect of objects inside
    object.position.y = -0.03
    return object
  }

  const wallsFactory = ({ width, height, length }) => {
    let geometry = new THREE.BoxBufferGeometry(
      width,
      height,
      length
    )
    var edges = new THREE.EdgesGeometry( geometry )
    var line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x999999 })
    )
    line.position.set(0, height / 2, 0)
    return line
  }

  useEffect(() => {
    if (world.room.visible) {
      if (!loaded) {
        load()
      } else {
        object.current = roomFactory({
          width: world.room.width,
          length: world.room.length,
          height: world.room.height,
          texture: wallTexture.current
        })
        object.current.visible = world.room.visible
        object.current.layers.disable(0)
        object.current.layers.enable(1)
        object.current.layers.disable(2)
        object.current.layers.enable(3)

        walls.current = wallsFactory(world.room)
        walls.current.visible = world.room.visible
        walls.current.layers.disable(0)
        walls.current.layers.disable(1)
        walls.current.layers.enable(2)
        walls.current.layers.disable(3)
        scene.add(object.current)

        scene.add(walls.current)
      }
    }

    return function cleanup () {
      scene.remove(object.current)
      scene.remove(walls.current)
    }
  }, [world.room, loaded])

  return object.current
}

const useEnvironmentModel = (world, scene, { modelData}) => {
  const [group, setGroup] = useState(null)

  useEffect(() => {
    if (modelData) {
      let g = new THREE.Group()

      let sceneData = onlyOfTypes(modelData.scene.clone(), ['Scene', 'Mesh', 'Group'])

      // update all Mesh textures
      sceneData.traverse(child => {
        if (child.isMesh) {
          let material = materialFactory()

          if (child.material.map) {
            material.map = child.material.map
            material.map.needsUpdate = true
          }

          child.material = material
        }
      })

      g.add( ...sceneData.children )

      setGroup(g)
    } else {
      setGroup(null)
    }
  }, [modelData])

  useEffect(() => {
    if (!group) return

    let scale = world.environment.scale
    group.scale.set(scale, scale, scale)
    group.updateMatrix()
  }, [group, world.environment.scale])

  useEffect(() => {
    if (group) {
      group.visible = world.environment.visible
    }
  }, [group, world.environment.visible])

  useEffect(() => {
    if (group) {
      group.rotation.y = world.environment.rotation
    }
  }, [group, world.environment.rotation])

  useEffect(() => {
    if (group) {
      group.position.x = world.environment.x
      group.position.z = world.environment.y
      group.position.y = world.environment.z
    }
  }, [group, world.environment.x, world.environment.y, world.environment.z])

  useEffect(() => {
    if (!group) return

    group.traverse(child => {
      // "always show"
      child.layers.disable(0)
      // camera
      child.layers.enable(1)
      // plot
      child.layers.disable(2)
      // image rendering
      child.layers.enable(3)
    })

    scene.add(group)

    return function cleanup () {
      scene.remove(group)
    }
  }, [group])

  return group
}

const World = React.memo(({ world, scene, modelData }) => {
  const ground = useGround(world, scene)
  const room = useRoom(world, scene)
  const environmentModel = useEnvironmentModel(world, scene, { modelData })

  const ambientLight = useRef(null)
  const directionalLight = useRef(null)

  useEffect(() => {
    scene.background
      ? scene.background.set(world.backgroundColor)
      : scene.background = new THREE.Color(world.backgroundColor)

  }, [world.backgroundColor])

  useEffect(() => {
    if (ambientLight.current)
    {
      ambientLight.current.intensity = world.ambient.intensity
    } else {
      ambientLight.current = new THREE.AmbientLight(0xffffff, world.ambient.intensity)
      scene.add(ambientLight.current)
    }
  }, [world.ambient.intensity])

  useEffect(() => {
    if (directionalLight.current)
    {
      directionalLight.current.intensity = world.directional.intensity
      directionalLight.current.rotation.x = 0
      directionalLight.current.rotation.z = 0
      directionalLight.current.rotation.y = world.directional.rotation
      directionalLight.current.rotateX(world.directional.tilt+Math.PI/2)

      //scene.remove(directionalLight.current.helper)
      // var helper = new THREE.DirectionalLightHelper( directionalLight.current, 0.14 );
      // scene.add(helper)
      //directionalLight.current.helper = helper
    } else {
      let dirLight = new THREE.DirectionalLight(0xffffff, world.directional.intensity)
      dirLight.position.set(0,1.5,0)
      dirLight.target.position.set(0,0,0.4)
      dirLight.add(dirLight.target)
      dirLight.intensity = world.directional.intensity
      dirLight.rotation.y = world.directional.rotation
      dirLight.rotateX(world.directional.tilt+Math.PI/2)
      //dirLight.rotation.x = world.directional.tilt+Math.PI/2
      directionalLight.current = dirLight
      // var helper = new THREE.DirectionalLightHelper( dirLight, 0.14 );
      // scene.add(helper)
      // directionalLight.current.helper = helper
      scene.add(directionalLight.current)
    }
  }, [world.directional.intensity, world.directional.rotation, world.directional.tilt])

  return null
})

module.exports = World
