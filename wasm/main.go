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

const (
	resultKey = "result"
	errorKey  = "error"
)

func main() {
	items := process.LoadItems()
	sprites := process.LoadSprites()

	namespace := js.Global().Get("tlootWASM")
	namespace.Set("getItems", js.FuncOf(func(this js.Value, args []js.Value) (retVal any) {
		ret := map[string]any{
			resultKey: nil,
			errorKey:  nil,
		}
		defer func() {
			retVal = ret
		}()

		results := map[string]any{}
		for _, item := range items {
			results[fmt.Sprintf("%d", item.ID)] = map[string]any{
				"id":       item.ID,
				"name":     item.Name,
				"value":    item.Value,
				"category": item.Category,
			}
		}

		ret[resultKey] = results
		return
	}))

	namespace.Set("getImageProcessor", js.FuncOf(func(this js.Value, args []js.Value) (retVal any) {
		ret := map[string]any{
			resultKey: nil,
			errorKey:  nil,
		}
		defer func() {
			retVal = ret
		}()

		imgData := args[0]
		imgBytes := make([]byte, imgData.Length())
		js.CopyBytesToGo(imgBytes, imgData)

		img, _, err := image.Decode(bytes.NewReader(imgBytes))
		if err != nil {
			ret[errorKey] = err.Error()
			return
		}

		proc := process.NewCallbackProcessor(img, items, sprites)

		ret[resultKey] = js.FuncOf(func(this js.Value, args []js.Value) (retVal any) {
			ret := map[string]any{
				resultKey: nil,
				errorKey:  nil,
			}
			defer func() {
				retVal = ret
			}()

			itemID := args[0]

			res, err := proc.Process(itemID.Int())
			if err != nil {
				ret[errorKey] = err.Error()
				return
			}

			ret[resultKey] = map[string]any{
				"id":    res.Item.ID,
				"count": res.Count,
			}
			return
		})

		return nil
	}))

	namespace.Get("onReady").Invoke()

	// Never exit.
	<-(make(chan struct{}))
}
