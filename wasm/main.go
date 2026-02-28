//go:build js && wasm

package main

import (
	"bytes"
	"fmt"
	"image"
	"syscall/js"

	"github.com/s5i/tloot/process"

	_ "image/png"
)

func main() {
	items := process.LoadItems()
	sprites := process.LoadSprites()

	namespace := js.Global().Get("tlootWASM")
	namespace.Set("itemsMap", js.FuncOf(func(this js.Value, args []js.Value) any {
		ret := map[string]any{}
		for _, item := range items {
			ret[fmt.Sprintf("%d", item.ID)] = map[string]any{
				"id":       item.ID,
				"name":     item.Name,
				"value":    item.Value,
				"category": item.Category,
			}
		}
		return ret
	}))

	namespace.Set("processImage", js.FuncOf(func(this js.Value, args []js.Value) any {
		onCallbackReady := args[0]
		errCallback := args[1]
		imgData := args[2]

		imgBytes := make([]byte, imgData.Length())
		js.CopyBytesToGo(imgBytes, imgData)

		img, _, err := image.Decode(bytes.NewReader(imgBytes))
		if err != nil {
			errCallback.Invoke(err.Error())
			return nil
		}

		proc := process.NewCallbackProcessor(img, items, sprites)

		onCallbackReady.Invoke(
			js.FuncOf(
				func(this js.Value, args []js.Value) any {
					onItemCountReady := args[0]
					errCallback := args[1]
					itemID := args[2]

					res, err := proc.Process(itemID.Int())
					if err != nil {
						errCallback.Invoke(err.Error())
						return nil
					}

					onItemCountReady.Invoke(res.Item.ID, res.Count)
					return nil
				},
			),
		)

		return nil
	}))

	namespace.Get("onReady").Invoke()

	// Never exit.
	<-(make(chan struct{}))
}
