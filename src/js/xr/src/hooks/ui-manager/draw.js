const {
  selectObject,
  updateObject,
  undoGroupStart,
  undoGroupEnd,
  initialState
} = require('../../../../shared/reducers/shot-generator')

const getPoseImageFilepathById = id => `/data/presets/poses/${id}.jpg`
const getModelImageFilepathById = id => `/data/system/objects/${id}.jpg`
const getCharacterImageFilepathById = id => `/data/system/dummies/gltf/${id}.jpg`

const drawText = ({ ctx, label, size, align = 'left', baseline = 'top', color = '#fff' }) => {
  ctx.save()
  ctx.font = `${size}px Arial`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillStyle = color
  ctx.fillText(label, 0, 0)
  ctx.restore()
}

const drawImageButton = ({ ctx, width, height, image, flip = false }) => {
  ctx.save()
  if (flip) ctx.scale(-1, 1)
  ctx.drawImage(image, flip ? -width : 0, 0, width, height)
  ctx.restore()
}

const drawButton = ({ ctx, width, height, label, fill = 'rgba(0, 0, 0, 0)' }) => {
  ctx.save()
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2, height / 2)
  ctx.font = '20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'black'
  ctx.fillText(label || '', 0, 0)
  ctx.restore()
}

const drawSlider = ({ ctx, width, height, state, label }) => {
  // value
  ctx.save()
  ctx.fillStyle = '#6E6E6E'
  if (state > 0) roundRect(ctx, 0, 0, (width - 10) * state, height, 12, true, false)

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  roundRect(ctx, 0, 0, width - 10, height, 12, false, true)

  // label
  ctx.translate(width / 2, height / 2)
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), 0, 0)
  ctx.restore()
}

const drawToggleButton = ({ ctx, width, height, cookieBoolean }) => {
  ctx.save()
  ctx.fillStyle = '#000'
  roundRect(ctx, 0, 0, width - 10, height, 36, true, false)

  ctx.fillStyle = '#6E6E6E'
  roundRect(ctx, (width - 10) * (cookieBoolean ? 0.5 : 0), 0, (width - 10) * 0.5, height, 36, true, false)

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  roundRect(ctx, 0, 0, width - 10, height, 36, false, true)
  ctx.restore()
}

const roundRect = (ctx, x, y, width, height, radius, fill, stroke) => {
  if (typeof stroke == 'undefined') {
    stroke = true
  }
  if (typeof radius === 'undefined') {
    radius = 5
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side]
    }
  }
  ctx.beginPath()
  ctx.moveTo(x + radius.tl, y)
  ctx.lineTo(x + width - radius.tr, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
  ctx.lineTo(x + width, y + height - radius.br)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
  ctx.lineTo(x + radius.bl, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
  ctx.lineTo(x, y + radius.tl)
  ctx.quadraticCurveTo(x, y, x + radius.tl, y)
  ctx.closePath()
  if (fill) {
    ctx.fill()
  }
  if (stroke) {
    ctx.stroke()
  }
}


const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
  var words = text.split(' '),
    line = '',
    lineCount = 0,
    i,
    test,
    metrics

  for (i = 0; i < words.length; i++) {
    test = words[i]
    metrics = context.measureText(test)
    while (metrics.width > maxWidth) {
      // Determine how much of the word will fit
      test = test.substring(0, test.length - 1)
      metrics = context.measureText(test)
    }
    if (words[i] != test) {
      words.splice(i + 1, 0, words[i].substr(test.length))
      words[i] = test
    }

    test = line + words[i] + ' '
    metrics = context.measureText(test)

    if (metrics.width > maxWidth && i > 0) {
      context.fillText(line, x, y)
      line = words[i] + ' '
      y += lineHeight
      lineCount++
    } else {
      line = test
    }
  }

  context.fillText(line, x, y)
}

const drawPaneBGs = (ctx) => {
  ctx.fillStyle = 'rgba(0,0,0)'
  // property
  roundRect(ctx, 4, 6, 439, 666, 25, true, false)
  // extended property
  roundRect(ctx, 554, 6, 439, 666, 25, true, false)
  roundRect(ctx, 6, 682, 439, 325 - 120, 25, true, false)
  roundRect(ctx, 483, 288, 66, 105, 25, true, false)
  // home
  roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  //roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  roundRect(ctx, 456, 684, 200, 200, 25, true, false)
  roundRect(ctx, 909, 684, 88, 88, 25, true, false)
  // back plane
  roundRect(ctx, 453, 889, 440, 132, 25, true, false)
}

const drawGrid = function drawGrid(ctx, x, y, width, height, items, type) {
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(x, y, width, height)
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  let cols = 4
  let itemHeight = width / cols / 0.68
  let gutter = 5
  let offset = this.state.grids[type].scrollTop || 0

  const gridHeight = Math.ceil(items.length / cols) * itemHeight
  let itemWidth = (width - gutter * (cols - 1)) / cols
  let visibleRows = Math.min(Math.ceil(height / itemHeight) + 1, items.length / cols)
  let startItem = Math.floor(offset / itemHeight) * cols

  offset = offset % itemHeight

  ctx.font = '30px Arial'
  ctx.textBaseline = 'top'

  for (let i2 = 0; i2 < visibleRows; i2++) {
    for (let i = 0; i < cols; i++) {
      if (startItem >= items.length) break
      const item = items[startItem]

      let filepath
      switch (type) {
        case 'pose':
          filepath = getPoseImageFilepathById(item.id)
          break
        case 'character':
          filepath = getCharacterImageFilepathById(item.id)
          break
        case 'object':
          filepath = getModelImageFilepathById(item.id)
          break
      }

      this.drawLoadableImage(
        filepath,

        image => {
          // loaded state
          // object should allow selection
          ctx.drawImage(image, x + i * itemWidth + i * gutter, y + itemHeight * i2 - offset, itemWidth, itemHeight - gutter)
        },

        () => {
          // loading state
          // object should not allow selection
          ctx.save()
          ctx.fillStyle = '#222'
          ctx.fillRect(x + i * itemWidth + i * gutter, y + itemHeight * i2 - offset, itemWidth, itemHeight - gutter)
          ctx.restore()
        }
      )

      this.paneComponents['grid'][item.name] = {
        id: item.id,
        name: item.name,
        type: 'button',
        x: x + i * itemWidth + i * gutter,
        y: y + itemHeight * i2 - offset,
        width: itemWidth,
        height: itemHeight - gutter,
        invisible: true
      }

      ctx.fillStyle = 'white'
      ctx.font = '24px Arial'
      ctx.textBaseline = 'top'
      ctx.fillText(startItem + 1, x + i * itemWidth + i * gutter + 8, y + itemHeight * i2 - offset + 8)

      ctx.font = '12px Arial'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        item.name.slice(0, 15),
        x + i * itemWidth + i * gutter + 2,
        y + itemHeight * i2 - offset + itemHeight - gutter - 2
      )
      startItem++
    }
  }

  this.paneComponents['grid']['grid-background'] = {
    id: 'grid-background',
    type: 'button',
    x,
    y,
    width,
    height,
    onSelect: (x, y) => {
      this.state.grids.startCoords = this.state.grids.prevCoords = { x, y }
    },
    onDrag: (x, y) => {
      const { grids } = this.state
      const offset = Math.floor((grids.prevCoords.y - y) * height)
      grids[type].scrollTop = Math.min(Math.max(grids[type].scrollTop + offset, 0), Math.max(gridHeight - height, 0))
      grids.prevCoords = { x, y }
      this.needsRender = true
    },
    onDrop: (x, y, u, v) => {
      const { startCoords } = this.state.grids
      const distance = new THREE.Vector2(startCoords.x, startCoords.y).distanceTo(new THREE.Vector2(x, y))

      if (distance < 0.1) {
        let canvasIntersection = this.getCanvasIntersection(u, v, false)

        if (canvasIntersection) {
          const name = canvasIntersection.id
          const id = this.state.selections[0]

          if (type === 'pose') {
            const pose = this.state.poses.find(pose => pose.id === name)
            const skeleton = pose.state.skeleton
            this.dispatch(updateObject(id, { name, skeleton }))
          } else if (type === 'character') {
            this.dispatch(undoGroupStart())
            this.dispatch(selectObject(null))
            this.dispatch(updateObject(id, { model: name, height: initialState.models[name].height }))
            this.dispatch(undoGroupEnd())
          } else if (type === 'object') {
            this.dispatch(updateObject(id, { model: name, depth: 1, height: 1, width: 1 }))
          }
        }
      }
    }
  }

  this.paneComponents['grid']['scrollbar'] = {
    id: 'scrollbar',
    type: 'button',
    x: width + 37 - 6,
    y,
    width: 24,
    height,
    onDrag: (x, y) => {
      const { grids } = this.state
      grids[type].scrollTop = Math.min(Math.max((gridHeight - height) * y, 0), Math.max(gridHeight - height, 0))
      this.needsRender = true
    }
  }

  // Indicator
  ctx.restore()
  const scrollPosition = this.state.grids[type].scrollTop / (gridHeight - height)

  ctx.fillStyle = '#000'
  roundRect(ctx, width + 37, y, 12, height, 6, true, false)

  ctx.fillStyle = '#6E6E6E'
  roundRect(ctx, width + 37, y + scrollPosition * height * 0.75, 12, height * 0.25, 6, true, false)

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  roundRect(ctx, width + 37, y, 12, height, 6, false, true)
}

module.exports = {
  drawText,
  drawImageButton,
  drawButton,
  drawSlider,
  drawToggleButton,
  roundRect,
  wrapText,
  drawPaneBGs,
  drawGrid
}