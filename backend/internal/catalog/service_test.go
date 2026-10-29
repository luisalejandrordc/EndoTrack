package catalog

import (
	"bytes"
	"endosoflow/internal/adapters/storage"
	"endosoflow/internal/auth"
	"endosoflow/internal/storagecleanup"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
)

// --- creating a model ---

func TestCreateModelWithFirstVersionColorAndMainImage(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	in := newModelInput()
	in.Categories = []string{" Camioneta ", "COMERCIAL", "camioneta"}
	m, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	e.trackModel(m.ID)

	if m.Name != in.Name || !m.IsActive || m.Version != 1 || strings.Join(m.Categories, ",") != "camioneta,comercial" {
		t.Fatalf("model = %+v", m)
	}
	if len(m.Versions) != 1 || m.Versions[0].ReferencePrice != "35000.00" || m.Versions[0].Name != "SR 4x2" {
		t.Fatalf("versions = %+v", m.Versions)
	}
	if len(m.Colors) != 1 || len(m.Colors[0].Images) != 1 || m.Colors[0].Images[0].Viewpoint != MainView {
		t.Fatalf("colors = %+v", m.Colors)
	}
	url := m.Colors[0].MainImageURL
	if !strings.HasPrefix(url, "https://img.test/catalog/colors/"+m.Colors[0].ID.String()+"/main-view-") || !strings.HasSuffix(url, ".png") {
		t.Fatalf("main image url = %s", url)
	}
	if keys := e.store.Keys(); len(keys) != 1 || e.store.PublicURL(keys[0]) != url {
		t.Fatalf("stored keys = %v", keys)
	}
	if obj, _ := e.store.Get(strings.TrimPrefix(url, "https://img.test/")); obj.ContentType != "image/png" {
		t.Fatalf("content type = %s", obj.ContentType)
	}
	for _, id := range []uuid.UUID{m.ID, m.Versions[0].ID, m.Colors[0].ID} {
		if e.countAudit(id, "CREATED") != 1 {
			t.Fatalf("missing CREATED audit for %s", id)
		}
	}
	if e.countAudit(m.Colors[0].Images[0].ID, "UPLOADED") != 1 {
		t.Fatal("missing UPLOADED audit for the image")
	}
}

func TestCreateModelAcceptsJPEGAndWebPAndDecidesTheTypeFromTheBytes(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	for name, data := range map[string][]byte{"jpg": jpegBytes(), "webp": webpBytes()} {
		m, err := e.svc.CreateModel(e.ctx, manager.actor(), newModelInput(), data)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		e.trackModel(m.ID)
		if !strings.HasSuffix(m.Colors[0].MainImageURL, "."+name) {
			t.Fatalf("%s: url = %s", name, m.Colors[0].MainImageURL)
		}
	}
}

func TestCreateModelRejectsBadImagesAndStoresNothing(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	cases := map[string]struct {
		data []byte
		want string
	}{
		"missing":        {nil, "IMAGE_REQUIRED"},
		"text file":      {[]byte("not an image at all"), "IMAGE_TYPE_NOT_ALLOWED"},
		"gif":            {[]byte("GIF89a\x01\x00\x01\x00\x00\x00\x00;"), "IMAGE_TYPE_NOT_ALLOWED"},
		"too large":      {append(pngBytes(2), bytes.Repeat([]byte{0}, MaxImageBytes)...), "IMAGE_TOO_LARGE"},
		"just over 5 MB": {append(pngBytes(2)[:8:8], bytes.Repeat([]byte{0}, MaxImageBytes)...), "IMAGE_TOO_LARGE"},
	}
	for name, c := range cases {
		_, err := e.svc.CreateModel(e.ctx, manager.actor(), newModelInput(), c.data)
		if code(err) != c.want {
			t.Errorf("%s: got %v, want %s", name, err, c.want)
		}
	}
	if len(e.store.Keys()) != 0 {
		t.Fatalf("a rejected image must never reach storage: %v", e.store.Keys())
	}
}

func TestCreateModelReportsEveryProblemAtOnce(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	_, err := e.svc.CreateModel(e.ctx, manager.actor(), CreateModelInput{Categories: []string{"tanque"}}, pngBytes(1))
	wantCode(t, err, "VALIDATION_FAILED")
	names := fieldNames(err)
	for _, want := range []string{"name", "categories", "version.name", "version.referencePrice", "color.name"} {
		if !names[want] {
			t.Errorf("missing a problem for %s: %v", want, names)
		}
	}
	in := newModelInput()
	in.Categories = nil
	_, err = e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
	if !fieldNames(err)["categories"] {
		t.Fatalf("a model needs a category: %v", fieldNames(err))
	}
}

func TestPricesMustBePositiveWithAtMostTwoDecimals(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	for _, bad := range []string{"0", "0.00", "-5", "10.999", "abc", "1e5", "", " ", "12345678901", "1,000"} {
		in := newModelInput()
		in.Version.ReferencePrice = money(bad)
		_, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
		if !fieldNames(err)["version.referencePrice"] {
			t.Errorf("price %q must be rejected, got %v", bad, err)
		}
	}
	for raw, want := range map[string]string{"35000": "35000.00", "35000.5": "35000.50", "0.01": "0.01", "9999999999.99": "9999999999.99"} {
		in := newModelInput()
		in.Version.ReferencePrice = money(raw)
		m, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
		if err != nil {
			t.Fatalf("price %q: %v", raw, err)
		}
		e.trackModel(m.ID)
		if m.Versions[0].ReferencePrice != want {
			t.Errorf("price %q stored as %s, want %s", raw, m.Versions[0].ReferencePrice, want)
		}
	}
}

func TestDuplicateModelNameFailsAndTheUploadedImageIsRemoved(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	first := e.createModel(manager.actor())
	before := len(e.store.Keys())

	in := newModelInput()
	in.Name = strings.ToUpper(first.Name)
	_, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(3))
	wantCode(t, err, "MODEL_NAME_ALREADY_USED")
	if len(e.store.Keys()) != before {
		t.Fatalf("the image of a failed creation must be removed: %v", e.store.Keys())
	}
}

func TestStorageFailureMeansNothingIsSaved(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	e.store.FailPut = errors.New("boom")
	in := newModelInput()
	_, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
	wantCode(t, err, "STORAGE_UNAVAILABLE")
	var n int
	if err := e.pool.QueryRow(e.ctx, `SELECT count(*) FROM vehicle_models WHERE model_name = $1`, in.Name).Scan(&n); err != nil || n != 0 {
		t.Fatalf("a model was saved without its image: %d %v", n, err)
	}
}

func TestOnlyAdminsAndManagersWrite(t *testing.T) {
	e := newTestEnv(t)
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	a := advisor.actor()

	_, err := e.svc.CreateModel(e.ctx, a, newModelInput(), pngBytes(1))
	wantCode(t, err, "FORBIDDEN")
	_, err = e.svc.UpdateModel(e.ctx, a, m.ID, UpdateModelInput{Version: ptrTo(1)})
	wantCode(t, err, "FORBIDDEN")
	_, err = e.svc.ArchiveModel(e.ctx, a, m.ID)
	wantCode(t, err, "FORBIDDEN")
	_, err = e.svc.CreateVersion(e.ctx, a, m.ID, VersionInput{Name: "X", ReferencePrice: money("1")})
	wantCode(t, err, "FORBIDDEN")
	_, err = e.svc.PutImage(e.ctx, a, m.Colors[0].ID, "interior", pngBytes(1))
	wantCode(t, err, "FORBIDDEN")
	wantCode(t, e.svc.DeleteModel(e.ctx, manager.actor(), m.ID, "x"), "FORBIDDEN")
	_, err = e.svc.List(e.ctx, auth.Actor{ID: uuid.New(), Role: auth.Role("customer")}, ModelFilter{})
	wantCode(t, err, "FORBIDDEN")
}

// --- reading ---

func TestAdvisorsSeeOnlyActiveEntries(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	m := e.createModel(manager.actor())
	v2, _ := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "SRX", ReferencePrice: money("42000")})
	if _, err := e.svc.ArchiveVersion(e.ctx, manager.actor(), v2.ID); err != nil {
		t.Fatal(err)
	}

	full, err := e.svc.Get(e.ctx, manager.actor(), m.ID)
	if err != nil || len(full.Versions) != 2 {
		t.Fatalf("manager sees archived versions: %v %+v", err, full)
	}
	seen, err := e.svc.Get(e.ctx, advisor.actor(), m.ID)
	if err != nil || len(seen.Versions) != 1 || seen.Versions[0].Name != "SR 4x2" {
		t.Fatalf("advisor must not see the archived version: %v %+v", err, seen)
	}

	if _, err := e.svc.ArchiveModel(e.ctx, manager.actor(), m.ID); err != nil {
		t.Fatal(err)
	}
	_, err = e.svc.Get(e.ctx, advisor.actor(), m.ID)
	wantCode(t, err, "MODEL_NOT_FOUND")
	if _, err := e.svc.Get(e.ctx, manager.actor(), m.ID); err != nil {
		t.Fatalf("manager still sees the archived model: %v", err)
	}
	list, _ := e.svc.List(e.ctx, advisor.actor(), ModelFilter{Search: m.Name, Status: "archived"})
	if list.Total != 0 {
		t.Fatalf("an advisor's list is always active only: %+v", list)
	}
	list, _ = e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: m.Name, Status: "archived"})
	if list.Total != 1 {
		t.Fatalf("manager archived list: %+v", list)
	}
}

func TestListSearchFiltersSummaryAndPagination(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	tag := uuid.NewString()[:8]

	mk := func(name string, cats []string, price string) *Model {
		in := newModelInput()
		in.Name, in.Categories, in.Version.ReferencePrice = name, cats, money(price)
		m, err := e.svc.CreateModel(e.ctx, manager.actor(), in, pngBytes(1))
		if err != nil {
			t.Fatal(err)
		}
		e.trackModel(m.ID)
		return m
	}
	a := mk("Yaris Ñandú "+tag, []string{"sedan", "hatchback"}, "21000")
	b := mk("Corolla "+tag, []string{"sedan"}, "25000")
	c := mk("Hiace "+tag, []string{"comercial"}, "40000")
	_, _ = e.svc.CreateVersion(e.ctx, manager.actor(), a.ID, VersionInput{Name: "Full", ReferencePrice: money("19500.50")})
	if _, err := e.svc.ArchiveModel(e.ctx, manager.actor(), c.ID); err != nil {
		t.Fatal(err)
	}

	res, err := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag})
	if err != nil || res.Total != 3 {
		t.Fatalf("search by tag: %v %+v", err, res)
	}
	if res, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: "NANDU " + tag}); res.Total != 1 || res.Items[0].ID != a.ID {
		t.Fatalf("search ignores accents and case: %+v", res)
	}
	if res, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag, Category: "sedan"}); res.Total != 2 {
		t.Fatalf("category filter: %+v", res)
	}
	if res, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag, Status: "archived"}); res.Total != 1 || res.Items[0].ID != c.ID {
		t.Fatalf("archived filter: %+v", res)
	}
	asc, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag, Sort: "name"})
	desc, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag, Sort: "-name"})
	if asc.Items[0].ID != desc.Items[2].ID {
		t.Fatal("-name must reverse name")
	}
	var summary ModelSummary
	for _, item := range asc.Items {
		if item.ID == a.ID {
			summary = item
		}
	}
	if summary.ActiveVersionCount != 2 || summary.ActiveColorCount != 1 || valueOf(summary.MinPrice) != "19500.50" ||
		valueOf(summary.MainImageURL) == "" || strings.Join(summary.Categories, ",") != "hatchback,sedan" {
		t.Fatalf("summary = %+v", summary)
	}
	if page2, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: tag, Page: 2, PageSize: 2}); page2.Total != 3 || len(page2.Items) != 1 {
		t.Fatalf("pagination: %+v", page2)
	}
	if res, _ := e.svc.List(e.ctx, manager.actor(), ModelFilter{Search: "%"}); res.Total != 0 {
		t.Fatalf("a lone %% must not match everything: %+v", res)
	}
	_ = b
}

func valueOf(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func TestSelectableOffersOnlyWhatCanBeSold(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	m := e.createModel(manager.actor())
	v2, _ := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "Limited", ReferencePrice: money("50000")})
	c2, _ := e.svc.CreateColor(e.ctx, manager.actor(), m.ID, ColorInput{Name: "Negro"}, pngBytes(5))

	find := func() *Selectable {
		t.Helper()
		items, err := e.svc.Selectable(e.ctx, advisor.actor())
		if err != nil {
			t.Fatal(err)
		}
		for i := range items {
			if items[i].ID == m.ID {
				return &items[i]
			}
		}
		return nil
	}
	s := find()
	if s == nil || len(s.Versions) != 2 || len(s.Colors) != 2 || s.Colors[0].MainImageURL == "" {
		t.Fatalf("selectable = %+v", s)
	}
	if s.Versions[0].ReferencePrice != "35000.00" {
		t.Fatalf("versions are ordered by price: %+v", s.Versions)
	}

	_, _ = e.svc.ArchiveVersion(e.ctx, manager.actor(), v2.ID)
	_, _ = e.svc.ArchiveColor(e.ctx, manager.actor(), c2.ID)
	if s := find(); s == nil || len(s.Versions) != 1 || len(s.Colors) != 1 {
		t.Fatalf("archived entries must disappear: %+v", s)
	}
	_, _ = e.svc.ArchiveModel(e.ctx, manager.actor(), m.ID)
	if find() != nil {
		t.Fatal("an archived model must not be offered")
	}
	_, _ = e.svc.UnarchiveModel(e.ctx, manager.actor(), m.ID)
	if find() == nil {
		t.Fatal("an unarchived model is offered again")
	}
}

// --- updating ---

func TestUpdateModelChecksVersionAuditsAndLeavesSnapshotsAlone(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	m := e.createModel(manager.actor())
	e.addSale(m, advisor.ID)

	_, err := e.svc.UpdateModel(e.ctx, manager.actor(), m.ID, UpdateModelInput{Name: ptrTo("x")})
	wantCode(t, err, "VERSION_REQUIRED")

	newName := uniqueName("Land Cruiser")
	updated, err := e.svc.UpdateModel(e.ctx, manager.actor(), m.ID, UpdateModelInput{
		Version: ptrTo(1), Name: &newName, Description: ptrTo(""), Categories: &[]string{"familiar"},
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != newName || updated.Version != 2 || updated.Description != nil || strings.Join(updated.Categories, ",") != "familiar" {
		t.Fatalf("updated = %+v", updated)
	}
	if e.countAudit(m.ID, "UPDATED") != 1 {
		t.Fatal("expected one UPDATED audit entry")
	}
	var snapshot string
	if err := e.pool.QueryRow(e.ctx, `SELECT vehicle_model_name_snapshot FROM sale_registers WHERE vehicle_model_id = $1`, m.ID).Scan(&snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot != m.Name {
		t.Fatalf("a renamed model must leave the sale snapshot as %q, got %q", m.Name, snapshot)
	}

	_, err = e.svc.UpdateModel(e.ctx, manager.actor(), m.ID, UpdateModelInput{Version: ptrTo(1), Name: ptrTo("Otro")})
	wantCode(t, err, "VERSION_CONFLICT")
	_, err = e.svc.UpdateModel(e.ctx, manager.actor(), m.ID, UpdateModelInput{Version: ptrTo(2), Categories: &[]string{}})
	if !fieldNames(err)["categories"] {
		t.Fatalf("a model cannot lose every category: %v", err)
	}
	_, err = e.svc.UpdateModel(e.ctx, manager.actor(), uuid.New(), UpdateModelInput{Version: ptrTo(1)})
	wantCode(t, err, "MODEL_NOT_FOUND")
}

func TestUpdateVersionPriceKeepsOldSalePrice(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	m := e.createModel(manager.actor())
	e.addSale(m, advisor.ID)
	vid := m.Versions[0].ID

	v, err := e.svc.UpdateVersion(e.ctx, manager.actor(), vid, UpdateVersionInput{Version: ptrTo(1), ReferencePrice: &Money{Raw: "36500.5", Set: true}})
	if err != nil || v.ReferencePrice != "36500.50" || v.Version != 2 {
		t.Fatalf("update: %v %+v", err, v)
	}
	var price string
	if err := e.pool.QueryRow(e.ctx, `SELECT vehicle_reference_price_snapshot::text FROM sale_registers WHERE vehicle_model_id = $1`, m.ID).Scan(&price); err != nil || price != "35000.00" {
		t.Fatalf("the sale keeps its price: %s %v", price, err)
	}
	_, err = e.svc.UpdateVersion(e.ctx, manager.actor(), vid, UpdateVersionInput{Version: ptrTo(2), ReferencePrice: &Money{Raw: "0", Set: true}})
	if !fieldNames(err)["referencePrice"] {
		t.Fatalf("a zero price must be rejected: %v", err)
	}
	_, err = e.svc.UpdateVersion(e.ctx, manager.actor(), vid, UpdateVersionInput{Version: ptrTo(1), Name: ptrTo("Otro")})
	wantCode(t, err, "VERSION_CONFLICT")
	_, err = e.svc.UpdateVersion(e.ctx, manager.actor(), uuid.New(), UpdateVersionInput{Version: ptrTo(1)})
	wantCode(t, err, "VERSION_NOT_FOUND")

	var summary string
	if err := e.pool.QueryRow(e.ctx, `SELECT changes_summary::text FROM audit_logs WHERE entity_id = $1 AND action = 'UPDATED'`, vid).Scan(&summary); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(summary, "35000.00") || !strings.Contains(summary, "36500.50") {
		t.Fatalf("the audit entry should hold both prices: %s", summary)
	}
}

func TestDuplicateVersionAndColorNamesAreRejectedPerModel(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	other := e.createModel(manager.actor())

	_, err := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "sr 4X2", ReferencePrice: money("1")})
	wantCode(t, err, "VERSION_NAME_ALREADY_USED")
	// Both models were created with a version called "SR 4x2" and a color called "Blanco": the names only
	// have to be unique inside one model.
	if _, err := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "Extra", ReferencePrice: money("1")}); err != nil {
		t.Fatalf("a new version name: %v", err)
	}
	if _, err := e.svc.CreateVersion(e.ctx, manager.actor(), other.ID, VersionInput{Name: "extra", ReferencePrice: money("1")}); err != nil {
		t.Fatalf("the same version name is fine on another model: %v", err)
	}
	_, err = e.svc.CreateColor(e.ctx, manager.actor(), m.ID, ColorInput{Name: "BLANCO"}, pngBytes(1))
	wantCode(t, err, "COLOR_NAME_ALREADY_USED")
}

// --- archiving ---

func TestArchiveRulesProtectTheLastActiveVersionAndColor(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	v1, c1 := m.Versions[0].ID, m.Colors[0].ID

	_, err := e.svc.ArchiveVersion(e.ctx, manager.actor(), v1)
	wantCode(t, err, "LAST_ACTIVE_VERSION")
	_, err = e.svc.ArchiveColor(e.ctx, manager.actor(), c1)
	wantCode(t, err, "LAST_ACTIVE_COLOR")

	v2, _ := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "Segunda", ReferencePrice: money("40000")})
	c2, err := e.svc.CreateColor(e.ctx, manager.actor(), m.ID, ColorInput{Name: "Rojo"}, pngBytes(9))
	if err != nil {
		t.Fatal(err)
	}
	if off, err := e.svc.ArchiveVersion(e.ctx, manager.actor(), v1); err != nil || off.IsActive {
		t.Fatalf("archive v1: %v %+v", err, off)
	}
	if off, err := e.svc.ArchiveColor(e.ctx, manager.actor(), c1); err != nil || off.IsActive {
		t.Fatalf("archive c1: %v %+v", err, off)
	}
	_, err = e.svc.ArchiveVersion(e.ctx, manager.actor(), v2.ID)
	wantCode(t, err, "LAST_ACTIVE_VERSION")
	_, err = e.svc.ArchiveColor(e.ctx, manager.actor(), c2.ID)
	wantCode(t, err, "LAST_ACTIVE_COLOR")
	_, err = e.svc.ArchiveVersion(e.ctx, manager.actor(), v1)
	wantCode(t, err, "CATALOG_ENTRY_ALREADY_ARCHIVED")

	if on, err := e.svc.UnarchiveVersion(e.ctx, manager.actor(), v1); err != nil || !on.IsActive {
		t.Fatalf("unarchive: %v %+v", err, on)
	}
	_, err = e.svc.UnarchiveVersion(e.ctx, manager.actor(), v1)
	wantCode(t, err, "CATALOG_ENTRY_ALREADY_ACTIVE")
	if e.countAudit(v1, "DEACTIVATED") != 1 || e.countAudit(v1, "REACTIVATED") != 1 {
		t.Fatal("expected DEACTIVATED and REACTIVATED audit entries")
	}

	// Once the model itself is archived the rule no longer applies, and the model can come back only if it
	// still has something active.
	if _, err := e.svc.ArchiveModel(e.ctx, manager.actor(), m.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.ArchiveVersion(e.ctx, manager.actor(), v1); err != nil {
		t.Fatalf("an archived model may archive its last version: %v", err)
	}
	if _, err := e.svc.ArchiveVersion(e.ctx, manager.actor(), v2.ID); err != nil {
		t.Fatalf("archive v2: %v", err)
	}
	_, err = e.svc.UnarchiveModel(e.ctx, manager.actor(), m.ID)
	wantCode(t, err, "CATALOG_INCOMPLETE")
	if _, err := e.svc.UnarchiveVersion(e.ctx, manager.actor(), v1); err != nil {
		t.Fatal(err)
	}
	if on, err := e.svc.UnarchiveModel(e.ctx, manager.actor(), m.ID); err != nil || !on.IsActive {
		t.Fatalf("unarchive model: %v", err)
	}
	_, err = e.svc.UnarchiveModel(e.ctx, manager.actor(), m.ID)
	wantCode(t, err, "CATALOG_ENTRY_ALREADY_ACTIVE")
}

func TestModelArchiveHidesButKeepsChildren(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	archived, err := e.svc.ArchiveModel(e.ctx, manager.actor(), m.ID)
	if err != nil || archived.IsActive {
		t.Fatalf("archive: %v", err)
	}
	if !archived.Versions[0].IsActive || !archived.Colors[0].IsActive {
		t.Fatal("archiving a model must not rewrite its versions and colors")
	}
	_, err = e.svc.ArchiveModel(e.ctx, manager.actor(), m.ID)
	wantCode(t, err, "CATALOG_ENTRY_ALREADY_ARCHIVED")
	if e.countAudit(m.ID, "DEACTIVATED") != 1 {
		t.Fatal("expected a DEACTIVATED audit entry")
	}
}

// --- images ---

func TestPutImageAddsReplacesAndRemoves(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	cid := m.Colors[0].ID

	c, err := e.svc.PutImage(e.ctx, manager.actor(), cid, "interior", jpegBytes())
	if err != nil || len(c.Images) != 2 {
		t.Fatalf("add interior: %v %+v", err, c)
	}
	var interior Image
	for _, img := range c.Images {
		if img.Viewpoint == "interior" {
			interior = img
		}
	}
	if interior.MimeType != "image/jpeg" || !strings.HasSuffix(interior.URL, ".jpg") || e.countAudit(interior.ID, "UPLOADED") != 1 {
		t.Fatalf("interior = %+v", interior)
	}
	oldKey := strings.TrimPrefix(interior.URL, "https://img.test/")

	// Replacing keeps one image per viewpoint and deletes the old file.
	c, err = e.svc.PutImage(e.ctx, manager.actor(), cid, "interior", pngBytes(7))
	if err != nil || len(c.Images) != 2 {
		t.Fatalf("replace: %v %+v", err, c)
	}
	if _, ok := e.store.Get(oldKey); ok {
		t.Fatal("the replaced file must be deleted from storage")
	}
	if e.countAudit(interior.ID, "REPLACED") != 1 {
		t.Fatal("expected a REPLACED audit entry")
	}
	var open int
	_ = e.pool.QueryRow(e.ctx, `SELECT count(*) FROM storage_deletions WHERE storage_key = $1 AND completed_at IS NOT NULL`, oldKey).Scan(&open)
	if open != 1 {
		t.Fatal("the deletion must be recorded as completed")
	}

	// The Main view can be replaced but never removed.
	mainBefore := c.MainImageURL
	c, err = e.svc.PutImage(e.ctx, manager.actor(), cid, MainView, pngBytes(8))
	if err != nil || c.MainImageURL == mainBefore || len(c.Images) != 2 {
		t.Fatalf("replace main: %v %+v", err, c)
	}
	_, err = e.svc.DeleteImage(e.ctx, manager.actor(), cid, MainView)
	wantCode(t, err, "MAIN_IMAGE_REQUIRED")

	c, err = e.svc.DeleteImage(e.ctx, manager.actor(), cid, "interior")
	if err != nil || len(c.Images) != 1 {
		t.Fatalf("remove: %v %+v", err, c)
	}
	if e.countAudit(interior.ID, "REMOVED") != 1 {
		t.Fatal("expected a REMOVED audit entry")
	}
	_, err = e.svc.DeleteImage(e.ctx, manager.actor(), cid, "interior")
	wantCode(t, err, "IMAGE_NOT_FOUND")
	if len(e.store.Keys()) != 1 {
		t.Fatalf("only the main image should remain in storage: %v", e.store.Keys())
	}
}

func TestImagesComeBackInViewpointOrderMainViewFirst(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	cid := m.Colors[0].ID
	// Uploaded in reverse, and alphabetical order would put "interior" before "main_view".
	for _, vp := range []string{"interior", "exterior_rear", "exterior_right", "exterior_left", "exterior_front"} {
		if _, err := e.svc.PutImage(e.ctx, manager.actor(), cid, vp, pngBytes(1)); err != nil {
			t.Fatalf("%s: %v", vp, err)
		}
	}
	got, err := e.svc.Get(e.ctx, manager.actor(), m.ID)
	if err != nil {
		t.Fatal(err)
	}
	var order []string
	for _, img := range got.Colors[0].Images {
		order = append(order, img.Viewpoint)
	}
	want := "main_view,exterior_front,exterior_left,exterior_right,exterior_rear,interior"
	if strings.Join(order, ",") != want {
		t.Fatalf("images are ordered %v, want %s", order, want)
	}
}

func TestPutImageValidation(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	cid := m.Colors[0].ID

	_, err := e.svc.PutImage(e.ctx, manager.actor(), cid, "roof", pngBytes(1))
	wantCode(t, err, "VALIDATION_FAILED")
	_, err = e.svc.PutImage(e.ctx, manager.actor(), cid, "interior", []byte("plain text"))
	wantCode(t, err, "IMAGE_TYPE_NOT_ALLOWED")
	_, err = e.svc.PutImage(e.ctx, manager.actor(), cid, "interior", nil)
	wantCode(t, err, "IMAGE_REQUIRED")
	_, err = e.svc.PutImage(e.ctx, manager.actor(), uuid.New(), "interior", pngBytes(1))
	wantCode(t, err, "COLOR_NOT_FOUND")
	_, err = e.svc.DeleteImage(e.ctx, manager.actor(), cid, "roof")
	wantCode(t, err, "VALIDATION_FAILED")
	if len(e.store.Keys()) != 1 {
		t.Fatalf("rejected images must not reach storage: %v", e.store.Keys())
	}
}

func TestAFailedFileDeletionStaysQueuedAndIsRetried(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	m := e.createModel(manager.actor())
	cid := m.Colors[0].ID
	oldKey := strings.TrimPrefix(m.Colors[0].MainImageURL, "https://img.test/")

	e.store.FailDelete = errors.New("storage is down")
	if _, err := e.svc.PutImage(e.ctx, manager.actor(), cid, MainView, pngBytes(4)); err != nil {
		t.Fatalf("the replacement itself must succeed even when cleanup fails: %v", err)
	}
	var attempts int
	var lastError *string
	err := e.pool.QueryRow(e.ctx, `SELECT attempt_count, last_error FROM storage_deletions WHERE storage_key = $1 AND completed_at IS NULL`, oldKey).Scan(&attempts, &lastError)
	if err != nil || attempts != 1 || lastError == nil || !strings.Contains(*lastError, "storage is down") {
		t.Fatalf("an open deletion is expected: %d %v %v", attempts, lastError, err)
	}
	if _, ok := e.store.Get(oldKey); !ok {
		t.Fatal("the old file is still in storage until the retry")
	}

	n, err := storagecleanup.RetryOpen(e.ctx, e.pool, e.store, e.logger, 100)
	if err != nil || n < 1 {
		t.Fatalf("retry: %d %v", n, err)
	}
	if _, ok := e.store.Get(oldKey); ok {
		t.Fatal("the retry must delete the old file")
	}
	var done int
	_ = e.pool.QueryRow(e.ctx, `SELECT count(*) FROM storage_deletions WHERE storage_key = $1 AND completed_at IS NOT NULL`, oldKey).Scan(&done)
	if done != 1 {
		t.Fatal("the retry must mark the deletion as completed")
	}
}

func TestUnconfiguredStoreFailsLoudly(t *testing.T) {
	e := newTestEnv(t)
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	svc := NewService(Deps{DB: e.pool, Store: storage.Unconfigured(), Logger: e.logger})
	_, err := svc.CreateModel(e.ctx, manager.actor(), newModelInput(), pngBytes(1))
	wantCode(t, err, "STORAGE_UNAVAILABLE")
}

// --- permanent deletion ---

func TestDeleteModelIsAdminOnlyNeedsAReasonAndRefusesModelsInUse(t *testing.T) {
	e := newTestEnv(t)
	admin := e.insertEmployee(auth.RoleSystemAdmin, "")
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")

	used := e.createModel(manager.actor())
	e.addSale(used, advisor.ID)
	wantCode(t, e.svc.DeleteModel(e.ctx, admin.actor(), used.ID, "Creado por error"), "CATALOG_ENTRY_IN_USE")

	m := e.createModel(manager.actor())
	_, _ = e.svc.PutImage(e.ctx, manager.actor(), m.Colors[0].ID, "interior", jpegBytes())
	wantCode(t, e.svc.DeleteModel(e.ctx, manager.actor(), m.ID, "x"), "FORBIDDEN")
	wantCode(t, e.svc.DeleteModel(e.ctx, admin.actor(), m.ID, "  "), "REASON_REQUIRED")
	storedBefore := len(e.store.Keys())
	if err := e.svc.DeleteModel(e.ctx, admin.actor(), m.ID, "Creado por error"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if got := len(e.store.Keys()); got != storedBefore-2 {
		t.Fatalf("both images must leave storage: %d -> %d", storedBefore, got)
	}
	if e.countAudit(m.ID, "DELETED") != 1 {
		t.Fatal("expected a DELETED audit entry")
	}
	_, err := e.svc.Get(e.ctx, admin.actor(), m.ID)
	wantCode(t, err, "MODEL_NOT_FOUND")
	wantCode(t, e.svc.DeleteModel(e.ctx, admin.actor(), m.ID, "otra vez"), "MODEL_NOT_FOUND")
}

func TestDeleteVersionAndColorRespectSalesAndTheLastActiveRule(t *testing.T) {
	e := newTestEnv(t)
	admin := e.insertEmployee(auth.RoleSystemAdmin, "")
	manager := e.insertEmployee(auth.RoleSalesManager, "")
	advisor := e.insertEmployee(auth.RoleSalesAdvisor, "")
	m := e.createModel(manager.actor())

	wantCode(t, e.svc.DeleteVersion(e.ctx, admin.actor(), m.Versions[0].ID, "x"), "LAST_ACTIVE_VERSION")
	wantCode(t, e.svc.DeleteColor(e.ctx, admin.actor(), m.Colors[0].ID, "x"), "LAST_ACTIVE_COLOR")
	wantCode(t, e.svc.DeleteVersion(e.ctx, manager.actor(), m.Versions[0].ID, "x"), "FORBIDDEN")

	v2, _ := e.svc.CreateVersion(e.ctx, manager.actor(), m.ID, VersionInput{Name: "Segunda", ReferencePrice: money("40000")})
	c2, _ := e.svc.CreateColor(e.ctx, manager.actor(), m.ID, ColorInput{Name: "Rojo"}, pngBytes(6))
	e.addSale(m, advisor.ID) // uses the first version and color
	wantCode(t, e.svc.DeleteVersion(e.ctx, admin.actor(), m.Versions[0].ID, "x"), "CATALOG_ENTRY_IN_USE")
	wantCode(t, e.svc.DeleteColor(e.ctx, admin.actor(), m.Colors[0].ID, "x"), "CATALOG_ENTRY_IN_USE")
	wantCode(t, e.svc.DeleteVersion(e.ctx, admin.actor(), v2.ID, " "), "REASON_REQUIRED")

	if err := e.svc.DeleteVersion(e.ctx, admin.actor(), v2.ID, "Duplicada"); err != nil {
		t.Fatalf("delete version: %v", err)
	}
	keysBefore := len(e.store.Keys())
	if err := e.svc.DeleteColor(e.ctx, admin.actor(), c2.ID, "Duplicado"); err != nil {
		t.Fatalf("delete color: %v", err)
	}
	if len(e.store.Keys()) != keysBefore-1 {
		t.Fatalf("the color's image must leave storage: %v", e.store.Keys())
	}
	if e.countAudit(v2.ID, "DELETED") != 1 || e.countAudit(c2.ID, "DELETED") != 1 {
		t.Fatal("expected DELETED audit entries")
	}
	wantCode(t, e.svc.DeleteVersion(e.ctx, admin.actor(), v2.ID, "x"), "VERSION_NOT_FOUND")
	wantCode(t, e.svc.DeleteColor(e.ctx, admin.actor(), c2.ID, "x"), "COLOR_NOT_FOUND")
}

func TestParsePriceEdgeCases(t *testing.T) {
	for raw, want := range map[string]int64{"1": 100, "1.5": 150, "0.01": 1, "35000.00": 3500000} {
		if got, ok := parsePrice(raw); !ok || got != want {
			t.Errorf("parsePrice(%q) = %d, %v; want %d", raw, got, ok, want)
		}
	}
	for _, raw := range []string{"", "0", "0.0", ".5", "1.", "1.234", "-1", "+1", "1e3", "٣"} {
		if _, ok := parsePrice(raw); ok {
			t.Errorf("parsePrice(%q) must fail", raw)
		}
	}
	if formatCents(5) != "0.05" || formatCents(3500000) != "35000.00" {
		t.Fatal("formatCents")
	}
}
