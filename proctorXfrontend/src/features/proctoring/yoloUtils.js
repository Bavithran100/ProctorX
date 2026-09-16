export const COCO_PERSON = 0;
export const COCO_CELL_PHONE = 67;
export const YOLO_INPUT_SIZE = 320;

export function createFrameBuffer() {
  const canvas = document.createElement("canvas");
  canvas.width = YOLO_INPUT_SIZE;
  canvas.height = YOLO_INPUT_SIZE;
  return {
    canvas,
    context: canvas.getContext("2d", { willReadFrequently: true }),
    tensor: new Float32Array(3 * YOLO_INPUT_SIZE * YOLO_INPUT_SIZE)
  };
}

export function videoToTensor(video, frameBuffer) {
  const { context, tensor, canvas } = frameBuffer;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const area = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;

  for (let index = 0; index < area; index += 1) {
    tensor[index] = pixels[index * 4] / 255;
    tensor[area + index] = pixels[index * 4 + 1] / 255;
    tensor[area * 2 + index] = pixels[index * 4 + 2] / 255;
  }
  return tensor;
}

function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - overlap;
  return union ? overlap / union : 0;
}

function nonMaximumSuppression(detections) {
  const kept = [];
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  while (sorted.length) {
    const candidate = sorted.shift();
    kept.push(candidate);
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (sorted[index].classId === candidate.classId
        && intersectionOverUnion(candidate, sorted[index]) > 0.45) {
        sorted.splice(index, 1);
      }
    }
  }
  return kept;
}

export function parseYoloOutput(output) {
  const { data, dims } = output;
  const channels = dims[1];
  const candidates = dims[2];
  if (channels < 84 || !candidates) return [];

  const detections = [];
  for (let candidate = 0; candidate < candidates; candidate += 1) {
    let classId = COCO_PERSON;
    let score = 0;
    for (let classIndex = 4; classIndex < channels; classIndex += 1) {
      const confidence = data[classIndex * candidates + candidate];
      if (confidence > score) {
        score = confidence;
        classId = classIndex - 4;
      }
    }

    if (score < 0.45 || (classId !== COCO_PERSON && classId !== COCO_CELL_PHONE)) continue;
    const centerX = data[candidate];
    const centerY = data[candidates + candidate];
    const width = data[candidates * 2 + candidate];
    const height = data[candidates * 3 + candidate];
    detections.push({
      classId,
      score,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height
    });
  }
  return nonMaximumSuppression(detections);
}
