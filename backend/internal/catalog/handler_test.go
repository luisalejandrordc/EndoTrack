package catalog

import (
	"bytes"
	"encoding/json"
	"endosoflow/internal/auth"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func (e *testEnv) router() http.Handler {
	authHandler := auth.NewHandler(e.auth, e.logger, auth.HandlerConfig{AppBaseURL: "http://app.test"})
	handler := NewHandler(e.svc, authHandler, e.logger)
	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		authHandler.Mount(r)
		handler.Mount(r)
	})
	return r
}

func (e *testEnv) tokenFor(emp testEmployee) string {
	e.t.Helper()
	session, err := e.auth.Login(e.ctx, auth.LoginRequest{DocumentType: "DNI", DocumentNumber: emp.DocNumber, Password: goodPassword}, auth.ClientInfo{})
	if err != nil {
		e.t.Fatalf("login: %v", err)
	}
	return session.AccessToken
}

func send(router http.Handler, method, path, contentType string, body []byte, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func sendJSON(router http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	return send(router, method, path, "application/json", []byte(body), token)
}

type part struct {
	name, filename, contentType string
	data                        []byte
}

func multipartBody(parts ...part) (string, []byte) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, p := range parts {
		header := textproto.MIMEHeader{}
		disposition := `form-data; name="` + p.name + `"`
		if p.filename != "" {
			disposition += `; filename="` + p.filename + `"`
		}
		header.Set("Content-Disposition", disposition)
		if p.contentType != "" {
			header.Set("Content-Type", p.contentType)
		}
		pw, _ := w.CreatePart(header)
		_, _ = pw.Write(p.data)
	}
	_ = w.Close()
	return w.FormDataContentType(), buf.Bytes()
}

func dataPart(v any) part {
	b, _ := json.Marshal(v)
	return part{name: "data", contentType: "application/json", data: b}
}

func TestCatalogRoutesRequireSignInAndTheRightRole(t *testing.T) {
	e := newTestEnv(t)
	router := e.router()
	adminEmp := e.insertEmployee(auth.RoleSystemAdmin, goodPassword)
	managerEmp := e.insertEmployee(auth.RoleSalesManager, goodPassword)
	advisorEmp := e.insertEmployee(auth.RoleSalesAdvisor, goodPassword)
	admin, manager, advisor := e.tokenFor(adminEmp), e.tokenFor(managerEmp), e.tokenFor(advisorEmp)
	m := e.createModel(managerEmp.actor())
	mp := "/api/v1/vehicle-models/" + m.ID.String()
	vp := "/api/v1/vehicle-versions/" + m.Versions[0].ID.String()
	cp := "/api/v1/vehicle-colors/" + m.Colors[0].ID.String()

	routes := []struct{ method, path string }{
		{"GET", "/api/v1/vehicle-models"},
		{"POST", "/api/v1/vehicle-models"},
		{"GET", mp},
		{"PATCH", mp},
		{"DELETE", mp + "?reason=x"},
		{"POST", mp + "/archive"},
		{"POST", mp + "/unarchive"},
		{"POST", mp + "/versions"},
		{"POST", mp + "/colors"},
		{"PATCH", vp},
		{"DELETE", vp + "?reason=x"},
		{"POST", vp + "/archive"},
		{"POST", vp + "/unarchive"},
		{"PATCH", cp},
		{"DELETE", cp + "?reason=x"},
		{"POST", cp + "/archive"},
		{"POST", cp + "/unarchive"},
		{"PUT", cp + "/images/interior"},
		{"DELETE", cp + "/images/interior"},
		{"GET", "/api/v1/catalog/selectable"},
	}
	for _, r := range routes {
		if rec := sendJSON(router, r.method, r.path, "{}", ""); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a token: %d", r.method, r.path, rec.Code)
		}
	}
	// An advisor can read but never write.
	for _, r := range routes {
		if r.method == "GET" {
			if rec := sendJSON(router, r.method, r.path, "", advisor); rec.Code != http.StatusOK {
				t.Errorf("advisor %s %s: %d, want 200", r.method, r.path, rec.Code)
			}
			continue
		}
		if rec := sendJSON(router, r.method, r.path, "{}", advisor); rec.Code != http.StatusForbidden {
			t.Errorf("advisor %s %s: %d, want 403", r.method, r.path, rec.Code)
		}
	}
	// A manager cannot delete; an admin passes the gate (and fails later on the missing reason or body).
	for _, r := range routes {
		if r.method != "DELETE" || strings.Contains(r.path, "/images/") {
			continue
		}
		if rec := sendJSON(router, r.method, r.path, "", manager); rec.Code != http.StatusForbidden {
			t.Errorf("manager %s %s: %d, want 403", r.method, r.path, rec.Code)
		}
		if rec := sendJSON(router, r.method, strings.Split(r.path, "?")[0], "", admin); rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("admin %s without a reason: %d, want 422", r.path, rec.Code)
		}
	}
}

func TestCreateModelOverMultipart(t *testing.T) {
	e := newTestEnv(t)
	router := e.router()
	manager := e.tokenFor(e.insertEmployee(auth.RoleSalesManager, goodPassword))

	// The price may be a JSON number or a string.
	body := map[string]any{
		"name": uniqueName("Rav4"), "categories": []string{"familiar"},
		"version": map[string]any{"name": "Hybrid", "referencePrice": 41999.5},
		"color":   map[string]any{"name": "Gris"},
	}
	ct, payload := multipartBody(dataPart(body), part{name: "mainImage", filename: "foto.png", contentType: "image/png", data: pngBytes(1)})
	rec := send(router, "POST", "/api/v1/vehicle-models", ct, payload, manager)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var m Model
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatal(err)
	}
	e.trackModel(m.ID)
	if m.Versions[0].ReferencePrice != "41999.50" || m.Colors[0].MainImageURL == "" {
		t.Fatalf("model = %+v", m)
	}
	body["name"] = uniqueName("Rav4")
	body["version"] = map[string]any{"name": "Hybrid", "referencePrice": "41999.50"}
	ct, payload = multipartBody(dataPart(body), part{name: "mainImage", filename: "foto.png", data: pngBytes(2)})
	if rec := send(router, "POST", "/api/v1/vehicle-models", ct, payload, manager); rec.Code != http.StatusCreated {
		t.Fatalf("string price: %d %s", rec.Code, rec.Body.String())
	} else {
		var second Model
		_ = json.Unmarshal(rec.Body.Bytes(), &second)
		e.trackModel(second.ID)
	}
}

func TestMultipartErrorsAreClearAndStoreNothing(t *testing.T) {
	e := newTestEnv(t)
	router := e.router()
	manager := e.tokenFor(e.insertEmployee(auth.RoleSalesManager, goodPassword))
	valid := map[string]any{
		"name": uniqueName("Prado"), "categories": []string{"camioneta"},
		"version": map[string]any{"name": "TX", "referencePrice": "50000"}, "color": map[string]any{"name": "Negro"},
	}
	image := part{name: "mainImage", filename: "a.png", data: pngBytes(1)}

	cases := []struct {
		name string
		ct   string
		body []byte
		want int
		code string
	}{
		{"plain JSON instead of multipart", "application/json", []byte(`{}`), 400, "INVALID_MULTIPART"},
		{"no content type", "", []byte(`{}`), 400, "INVALID_MULTIPART"},
	}
	for _, c := range cases {
		rec := send(router, "POST", "/api/v1/vehicle-models", c.ct, c.body, manager)
		if rec.Code != c.want || !strings.Contains(rec.Body.String(), c.code) {
			t.Errorf("%s: %d %s", c.name, rec.Code, rec.Body.String())
		}
	}
	type multipartCase struct {
		name  string
		parts []part
		want  int
		code  string
	}
	for _, c := range []multipartCase{
		{"missing data part", []part{image}, 400, "INVALID_JSON"},
		{"missing image", []part{dataPart(valid)}, 422, "IMAGE_REQUIRED"},
		{"unknown part", []part{dataPart(valid), image, {name: "extra", data: []byte("x")}}, 400, "INVALID_MULTIPART"},
		{"two images", []part{dataPart(valid), image, image}, 400, "INVALID_MULTIPART"},
		{"two data parts", []part{dataPart(valid), dataPart(valid), image}, 400, "INVALID_MULTIPART"},
		{"unknown json field", []part{{name: "data", data: []byte(`{"name":"x","bogus":1}`)}, image}, 400, "INVALID_JSON"},
		{"broken json", []part{{name: "data", data: []byte(`{`)}, image}, 400, "INVALID_JSON"},
		{"not an image", []part{dataPart(valid), {name: "mainImage", filename: "a.png", contentType: "image/png", data: []byte("MZ-this-is-an-exe")}}, 422, "IMAGE_TYPE_NOT_ALLOWED"},
		{"too large", []part{dataPart(valid), {name: "mainImage", filename: "a.png", data: append(pngBytes(1), bytes.Repeat([]byte{1}, MaxImageBytes)...)}}, 413, "IMAGE_TOO_LARGE"},
	} {
		ct, payload := multipartBody(c.parts...)
		rec := send(router, "POST", "/api/v1/vehicle-models", ct, payload, manager)
		if rec.Code != c.want || !strings.Contains(rec.Body.String(), c.code) {
			t.Errorf("%s: %d %s", c.name, rec.Code, rec.Body.String())
		}
	}
	// A body far beyond the limit is cut off while it streams.
	huge := bytes.Repeat([]byte{1}, MaxImageBytes+1<<20)
	ct, payload := multipartBody(dataPart(valid), part{name: "mainImage", filename: "a.png", data: huge})
	if rec := send(router, "POST", "/api/v1/vehicle-models", ct, payload, manager); rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("huge body: %d %s", rec.Code, rec.Body.String())
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("nothing may be stored after these failures: %v", e.store.Keys())
	}
}

func TestCatalogLifecycleOverHTTP(t *testing.T) {
	e := newTestEnv(t)
	router := e.router()
	manager := e.tokenFor(e.insertEmployee(auth.RoleSalesManager, goodPassword))
	admin := e.tokenFor(e.insertEmployee(auth.RoleSystemAdmin, goodPassword))
	advisor := e.tokenFor(e.insertEmployee(auth.RoleSalesAdvisor, goodPassword))

	ct, payload := multipartBody(dataPart(map[string]any{
		"name": uniqueName("Fortuner"), "categories": []string{"familiar"},
		"version": map[string]any{"name": "SRV", "referencePrice": "52000"}, "color": map[string]any{"name": "Plata"},
	}), part{name: "mainImage", filename: "a.png", data: pngBytes(1)})
	rec := send(router, "POST", "/api/v1/vehicle-models", ct, payload, manager)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var m Model
	_ = json.Unmarshal(rec.Body.Bytes(), &m)
	e.trackModel(m.ID)
	mp := "/api/v1/vehicle-models/" + m.ID.String()

	if rec := sendJSON(router, "GET", mp, "", advisor); rec.Code != http.StatusOK {
		t.Fatalf("advisor get: %d", rec.Code)
	}
	if rec := sendJSON(router, "GET", "/api/v1/vehicle-models/not-a-uuid", "", manager); rec.Code != http.StatusNotFound {
		t.Fatalf("bad id: %d", rec.Code)
	}
	for _, q := range []string{"?status=bogus", "?category=bogus", "?page=0", "?pageSize=abc"} {
		if rec := sendJSON(router, "GET", "/api/v1/vehicle-models"+q, "", manager); rec.Code != http.StatusBadRequest {
			t.Errorf("list %s: %d", q, rec.Code)
		}
	}
	if rec := sendJSON(router, "PATCH", mp, `{"version":1,"name":"Fortuner GR"}`, manager); rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "PATCH", mp, `{"version":1,"name":"Otra vez"}`, manager); rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "VERSION_CONFLICT") {
		t.Fatalf("stale patch: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "PATCH", mp, `{"version":2,"bogus":true}`, manager); rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown field: %d", rec.Code)
	}

	rec = sendJSON(router, "POST", mp+"/versions", `{"name":"GR Sport","referencePrice":60000}`, manager)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create version: %d %s", rec.Code, rec.Body.String())
	}
	var v Version
	_ = json.Unmarshal(rec.Body.Bytes(), &v)
	vp := "/api/v1/vehicle-versions/" + v.ID.String()
	if rec := sendJSON(router, "PATCH", vp, `{"version":1,"referencePrice":"61000.00"}`, manager); rec.Code != http.StatusOK {
		t.Fatalf("patch version: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "POST", vp+"/archive", "", manager); rec.Code != http.StatusOK {
		t.Fatalf("archive version: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "POST", vp+"/unarchive", "", manager); rec.Code != http.StatusOK {
		t.Fatalf("unarchive version: %d", rec.Code)
	}

	ct, payload = multipartBody(dataPart(map[string]any{"name": "Azul"}), part{name: "mainImage", filename: "a.jpg", data: jpegBytes()})
	rec = send(router, "POST", mp+"/colors", ct, payload, manager)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create color: %d %s", rec.Code, rec.Body.String())
	}
	var c Color
	_ = json.Unmarshal(rec.Body.Bytes(), &c)
	cp := "/api/v1/vehicle-colors/" + c.ID.String()

	ct, payload = multipartBody(part{name: "file", filename: "i.png", data: pngBytes(3)})
	if rec := send(router, "PUT", cp+"/images/interior", ct, payload, manager); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"viewpoint":"interior"`) {
		t.Fatalf("put image: %d %s", rec.Code, rec.Body.String())
	}
	ct, payload = multipartBody(part{name: "file", filename: "i.png", data: pngBytes(4)})
	if rec := send(router, "PUT", cp+"/images/roof", ct, payload, manager); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad viewpoint: %d %s", rec.Code, rec.Body.String())
	}
	ct, payload = multipartBody(part{name: "mainImage", filename: "i.png", data: pngBytes(4)})
	if rec := send(router, "PUT", cp+"/images/interior", ct, payload, manager); rec.Code != http.StatusBadRequest {
		t.Fatalf("wrong field name: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "DELETE", cp+"/images/main_view", "", manager); rec.Code != http.StatusUnprocessableEntity || !strings.Contains(rec.Body.String(), "MAIN_IMAGE_REQUIRED") {
		t.Fatalf("delete main: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "DELETE", cp+"/images/interior", "", manager); rec.Code != http.StatusOK {
		t.Fatalf("delete image: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "PATCH", cp, `{"version":1,"name":"Azul Marino"}`, manager); rec.Code != http.StatusOK {
		t.Fatalf("patch color: %d %s", rec.Code, rec.Body.String())
	}
	if rec := sendJSON(router, "POST", cp+"/archive", "", manager); rec.Code != http.StatusOK {
		t.Fatalf("archive color: %d", rec.Code)
	}

	if rec := sendJSON(router, "POST", mp+"/archive", "", manager); rec.Code != http.StatusOK {
		t.Fatalf("archive model: %d", rec.Code)
	}
	if rec := sendJSON(router, "GET", mp, "", advisor); rec.Code != http.StatusNotFound {
		t.Fatalf("advisor must not see an archived model: %d", rec.Code)
	}
	if rec := sendJSON(router, "DELETE", mp+"?reason=Creado%20por%20error", "", admin); rec.Code != http.StatusNoContent {
		t.Fatalf("delete model: %d %s", rec.Code, rec.Body.String())
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("every image must be gone from storage: %v", e.store.Keys())
	}
}

func TestSelectableOverHTTPHasTheDocumentedShape(t *testing.T) {
	e := newTestEnv(t)
	router := e.router()
	manager := e.insertEmployee(auth.RoleSalesManager, goodPassword)
	m := e.createModel(manager.actor())
	rec := sendJSON(router, "GET", "/api/v1/catalog/selectable", "", e.tokenFor(manager))
	if rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Items []Selectable `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, s := range body.Items {
		if s.ID == m.ID {
			if len(s.Versions) != 1 || s.Versions[0].ReferencePrice != "35000.00" || len(s.Colors) != 1 || s.Colors[0].MainImageURL == "" {
				t.Fatalf("selectable = %+v", s)
			}
			return
		}
	}
	t.Fatal("the new model is missing from the selectable list")
}
