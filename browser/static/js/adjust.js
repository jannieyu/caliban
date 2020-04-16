// helper functions

// modify image data in place to recolor
function recolorScaled (data, i, j, jlen, r = 255, g = 255, b = 255) {
  // location in 1D array based on i and j
  const pixelNum = (jlen * j + i) * 4;
  // set to color by changing RGB values
  // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
  data[pixelNum] += r;
  data[pixelNum + 1] += g;
  data[pixelNum + 2] += b;
}

// image adjustment functions: take img as input and manipulate data attribute
// pixel data is 1D array of 8bit RGBA values
function contrastImage (img, contrast = 0, brightness = 0) {
  contrast = (contrast / 100) + 1;
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i] * contrast + brightness;
    img.data[i + 1] = img.data[i + 1] * contrast + brightness;
    img.data[i + 2] = img.data[i + 2] * contrast + brightness;
  }
  return img;
}

function grayscale(img) {
  for (var i = 0; i < img.data.length; i += 4) {
    var avg = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    img.data[i] = avg; // red
    img.data[i + 1] = avg; // green
    img.data[i + 2] = avg; // blue
  }
  return img;
}

function invert(img) {
  for (var i = 0; i < img.data.length; i += 4) {
    img.data[i] = 255 - img.data[i]; // red
    img.data[i + 1] = 255 - img.data[i + 1]; // green
    img.data[i + 2] = 255 - img.data[i + 2]; // blue
  }
  return img;
}

function preCompositeLabelMod(img, h1, h2) {
  // use label array to figure out which pixels to recolor
  let currentVal;
  for (var j = 0; j < seg_array.length; j += 1) { // y
    for (var i = 0; i < seg_array[j].length; i += 1) { // x
      currentVal = Math.abs(seg_array[j][i]);
      if (currentVal === h1 || currentVal === h2) {
        recolorScaled(
          img.data, i, j, seg_array[j].length,
          r = 255, g = -255, b = -255
        );
      }
    }
  }
}

function postCompositeLabelMod(img,
  redOutline = false, r1 = -1,
  singleOutline = false, o1 = -1, outlineAll = false,
  translucent = false, t1 = -1, t2 = -1) {
  let currentVal;
  let jlen;
  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j++) { // y
    for (var i = 0; i < seg_array[j].length; i++) { // x
      jlen = seg_array[j].length;
      currentVal = seg_array[j][i];
      // outline red
      if (redOutline && currentVal === -r1) {
        recolorScaled(img.data, i, j, jlen, r=255, g=-255, b=-255);
        continue;
      // outline white single
      } else if (singleOutline && currentVal === -o1) {
        recolorScaled(img.data, i, j, jlen, r=255, g=255, b=255);
        continue;
      // outline all remaining edges with white
      } else if (outlineAll && currentVal < 0) {
        recolorScaled(img.data, i, j, jlen, r=255, g=255, b=255);
        continue;
      // translucent highlight
      } else if (translucent &&
            (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
        recolorScaled(img.data, i, j, jlen, r=60, g=60, b=60);
        continue;
      }
    }
  }
}

// apply contrast+brightness to raw image
function contrastRaw(contrast, brightness) {
  const canvas = document.getElementById('hidden_seg_canvas');
  const ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(raw_image, 0, 0, rawWidth, rawHeight);
  const rawData = ctx.getImageData(0, 0, rawWidth, rawHeight);
  contrastImage(rawData, contrast, brightness);
  ctx.putImageData(rawData, 0, 0);

  contrastedRaw.src = canvas.toDataURL();
}

function preCompAdjust() {
  const canvas = document.getElementById('hidden_seg_canvas');
  const ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(seg_image, 0, 0, rawWidth, rawHeight);

  if (current_highlight) {
    let segData = ctx.getImageData(0, 0, rawWidth, rawHeight);

    if (edit_mode) {
      h1 = brush.value;
      h2 = -1;
    } else {
      h1 = mode.highlighted_cell_one;
      h2 = mode.highlighted_cell_two;
    }

    // highlight
    preCompositeLabelMod(segData, h1, h2);
    ctx.putImageData(segData, 0, 0);
  }

  // once this new src is loaded, displayed image will be rerendered
  preCompSeg.src = canvas.toDataURL();
}

// adjust raw further (if needed), composite annotations on top
function compositeImages() {
  const canvas = document.getElementById('hidden_seg_canvas');
  const ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // further adjust raw image
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(contrastedRaw, 0, 0, rawWidth, rawHeight);
  const rawData = ctx.getImageData(0, 0, rawWidth, rawHeight);
  grayscale(rawData);
  if (display_invert) {
    invert(rawData);
  }
  ctx.putImageData(rawData, 0, 0);

  // add labels on top
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.drawImage(preCompSeg, 0, 0, rawWidth, rawHeight);
  ctx.restore();

  compositedImg.src = canvas.toDataURL();
}

// apply outlines, transparent highlighting
function postCompAdjust() {
  const canvas = document.getElementById('hidden_seg_canvas');
  const ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(compositedImg, 0, 0, rawWidth, rawHeight);

  // add outlines around conversion brush target/value
  let imgData = ctx.getImageData(0, 0, rawWidth, rawHeight);

  let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;
  // red outline for conversion brush target
  if (edit_mode && brush.conv && brush.target !== -1) {
    redOutline = true;
    r1 = brush.target;
  }
  if (edit_mode && brush.conv && brush.value !== -1) {
    singleOutline = true;
    o1 = brush.value;
  }

  postCompositeLabelMod(
    imgData, redOutline, r1, singleOutline, o1,
    outlineAll, translucent, t1, t2
  );

  ctx.putImageData(imgData, 0, 0);

  postCompImg.src = canvas.toDataURL();
}

// apply outlines, transparent highlighting for RGB
function postCompAdjustRGB() {
  const canvas = document.getElementById('hidden_seg_canvas');
  const ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(contrastedRaw, 0, 0, rawWidth, rawHeight);

  // add outlines around conversion brush target/value
  const imgData = ctx.getImageData(0, 0, rawWidth, rawHeight);

  let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;

  // red outline for conversion brush target
  if (edit_mode && brush.conv && brush.target !== -1) {
    redOutline = true;
    r1 = brush.target;
  }

  // singleOutline never on for RGB

  outlineAll = true;

  // translucent highlight
  if (current_highlight) {
    translucent = true;
    if (edit_mode) {
      t1 = brush.value;
    } else {
      t1 = mode.highlighted_cell_one;
      t2 = mode.highlighted_cell_two;
    }
  }

  postCompositeLabelMod(imgData, redOutline, r1, singleOutline, o1,
    outlineAll, translucent, t1, t2);

  ctx.putImageData(imgData, 0, 0);

  postCompImg.src = canvas.toDataURL();
}

function prepareRaw() {
  contrastRaw(current_contrast, brightness);
}

function segAdjust() {
  segLoaded = true;
  if (rawLoaded && segLoaded) {
    if (rgb) {
      postCompAdjustRGB();
    } else {
      compositeImages();
    }
  }
}

function rawAdjust() {
  rawLoaded = true;
  if (rawLoaded && segLoaded) {
    if (rgb) {
      postCompAdjustRGB();
    } else {
      compositeImages();
    }
  }
}
