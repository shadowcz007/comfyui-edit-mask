import { app } from '../../../scripts/app.js'
import { ComfyDialog } from '../../../scripts/ui.js'
import { api } from '../../../scripts/api.js'

// 扩展原型链上的 close 方法
const originalClose = ComfyDialog.prototype.close
ComfyDialog.prototype.close = function () {
  // console.log('#ComfyDialog', 111111) // 新增的console日志
  originalClose.call(this) // 调用原始的 close 方法

  const nodes = app.graph.findNodesByType('EditMask')

  for (const node of nodes) {
    const image_update = node.widgets.filter(w => w.name == 'image_update')[0]
    //为了做一个mask编辑后的标记
    node.images=Array.from(node.images,im=>{
      im.update=true;
      return im
    })
    image_update.value = { images:node.images  }
  }
}

function get_position_style (ctx, widget_width, y, node_height) {
  const MARGIN = 4 // the margin around the html element

  /* Create a transform that deals with all the scrolling and zooming */
  const elRect = ctx.canvas.getBoundingClientRect()
  const transform = new DOMMatrix()
    .scaleSelf(
      elRect.width / ctx.canvas.width,
      elRect.height / ctx.canvas.height
    )
    .multiplySelf(ctx.getTransform())
    .translateSelf(MARGIN, MARGIN + y)

  return {
    transformOrigin: '0 0',
    transform: transform,
    left: `0`,
    top: '0',
    cursor: 'pointer',
    position: 'absolute',
    maxWidth: `${widget_width - MARGIN * 2}px`,
    // maxHeight: `${node_height - MARGIN * 2}px`, // we're assuming we have the whole height of the node
    width: `${widget_width - MARGIN * 2}px`,
    // height: `${node_height * 0.3 - MARGIN * 2}px`,
    // background: '#EEEEEE',
    display: 'flex',
    flexDirection: 'column',
    // alignItems: 'center',
    justifyContent: 'space-around'
  }
}

app.registerExtension({
  name: 'comfyui-edit-mask.editMask',
  async getCustomWidgets (app) {
    return {
      IMAGE_FILE (node, inputName, inputData, app) {
        const widget = {
          type: inputData[0], // the type, CHEESE
          name: inputName, // the name, slice
          size: [128, 88], // a default size
          draw (ctx, node, width, y) {},
          callback: e => console.log(e),
          computeSize (...args) {
            return [128, 88] // a method to compute the current size of the widget
          },
          async serializeValue (nodeId, widgetIndex) {
            // node=app.graph.getNodeById(node.id)
            if (node.images) return { images: node.images }
            return {}
          }
        }
        node.addCustomWidget(widget)
        return widget
      }
    }
  },

  async beforeRegisterNodeDef (nodeType, nodeData, app) {
    // 节点创建之后的事件回调
    const orig_nodeCreated = nodeType.prototype.onNodeCreated
    nodeType.prototype.onNodeCreated = function () {
      orig_nodeCreated?.apply(this, arguments)
    }
  },
  async loadedGraphNode (node, app) {
    if (node.type === 'EditMask') {
      let image_update = node.widgets.filter(w => w.name === 'image_update')[0]
      console.log('#image_update', image_update)

      //从ComfyUI\web\scripts\widgets.js，IMAGEUPLOAD参考代码
      function showImage (file) {
        const { filename, subfolder } = file
        const img = new Image()
        img.onload = () => {
          node.imgs = [img]
          app.graph.setDirtyCanvas(true)
        }
        img.src = api.apiURL(
          `/view?filename=${encodeURIComponent(
            filename
          )}&type=input&subfolder=${subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`
        )
        node.setSizeForImage?.()
      }

      if (image_update.value?.images?.length > 0)
        showImage(image_update.value.images[0])
    }
  }
})
