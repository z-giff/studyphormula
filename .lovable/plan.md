# Preserve white-pen drawings in study mode

## Change
- Keep the study drawing board white, as required by the existing card design.
- In the display renderer only, convert saved white pen strokes to a visible neutral gray.
- Continue converting the editor's light-gray eraser strokes to the white board color, so erased areas remain erased.

## Verification
- Confirm white pen, normal colored pen, and eraser strokes each render correctly.
- Check the app build and resolve the monitoring finding after validation.

## Technical detail
The editor stores white pen strokes as `#ffffff` and eraser strokes as `#f5f5f5`, so the renderer can distinguish them without changing saved drawings or editor behavior.
