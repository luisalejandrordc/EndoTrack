package httpx

import (
	"encoding/json"
	"endosoflow/internal/platform/apperr"
	"errors"
	"io"
	"net/http"
)

// DecodeJSON reads a JSON request body into dst. It limits the size to 1 MB, rejects unknown fields
// and rejects anything after the first JSON value.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return apperr.BadRequest("INVALID_JSON", "El cuerpo de la solicitud no es válido.").WithCause(err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return apperr.BadRequest("INVALID_JSON", "El cuerpo de la solicitud no es válido.")
	}
	return nil
}
