package domain

import "testing"

func makeSession(userID string, wordIDs []string) *Session {
	items := make([]SessionItem, len(wordIDs))
	for i, id := range wordIDs {
		items[i] = SessionItem{WordID: id, ReviewType: "mcq"}
	}
	return &Session{UserID: userID, Items: items, Index: 0}
}

func TestSession_Current(t *testing.T) {
	t.Run("nil session returns nil", func(t *testing.T) {
		var s *Session
		if got := s.Current(); got != nil {
			t.Errorf("Current() on nil session = %v, want nil", got)
		}
	})

	t.Run("empty Items returns nil", func(t *testing.T) {
		s := &Session{UserID: "u1", Items: []SessionItem{}, Index: 0}
		if got := s.Current(); got != nil {
			t.Errorf("Current() on empty session = %v, want nil", got)
		}
	})

	t.Run("returns first item at index 0", func(t *testing.T) {
		s := makeSession("u1", []string{"w1", "w2", "w3"})
		got := s.Current()
		if got == nil {
			t.Fatal("Current() returned nil, want item")
		}
		if got.WordID != "w1" {
			t.Errorf("Current().WordID = %q, want %q", got.WordID, "w1")
		}
	})

	t.Run("returns correct item after advance", func(t *testing.T) {
		s := makeSession("u1", []string{"w1", "w2", "w3"})
		s.Index = 1
		got := s.Current()
		if got == nil {
			t.Fatal("Current() returned nil, want item")
		}
		if got.WordID != "w2" {
			t.Errorf("Current().WordID = %q, want %q", got.WordID, "w2")
		}
	})

	t.Run("index at len returns nil (session done)", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		s.Index = 1
		if got := s.Current(); got != nil {
			t.Errorf("Current() with index==len = %v, want nil", got)
		}
	})

	t.Run("index past len returns nil", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		s.Index = 99
		if got := s.Current(); got != nil {
			t.Errorf("Current() with index>len = %v, want nil", got)
		}
	})
}

func TestSession_Advance(t *testing.T) {
	t.Run("nil session does not panic", func(t *testing.T) {
		var s *Session
		s.Advance() // should not panic
	})

	t.Run("advances index by 1", func(t *testing.T) {
		s := makeSession("u1", []string{"w1", "w2"})
		s.Advance()
		if s.Index != 1 {
			t.Errorf("Index = %d, want 1", s.Index)
		}
	})

	t.Run("advance from last item sets index to len", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		s.Advance()
		if s.Index != 1 {
			t.Errorf("Index after last advance = %d, want 1", s.Index)
		}
	})

	t.Run("advance does not go past len", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		s.Advance() // Index = 1 == len
		s.Advance() // should not increment further
		if s.Index != 1 {
			t.Errorf("Index after double advance = %d, want 1 (capped at len)", s.Index)
		}
	})

	t.Run("multiple advances traverse all items", func(t *testing.T) {
		s := makeSession("u1", []string{"w1", "w2", "w3"})
		for i := 0; i < 3; i++ {
			s.Advance()
		}
		if s.Index != 3 {
			t.Errorf("Index = %d, want 3", s.Index)
		}
	})
}

func TestSession_Done(t *testing.T) {
	t.Run("nil session is done", func(t *testing.T) {
		var s *Session
		if !s.Done() {
			t.Error("Done() on nil session = false, want true")
		}
	})

	t.Run("empty Items is done", func(t *testing.T) {
		s := &Session{Items: []SessionItem{}, Index: 0}
		if !s.Done() {
			t.Error("Done() on empty session = false, want true")
		}
	})

	t.Run("not done at index 0 with items", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		if s.Done() {
			t.Error("Done() = true on fresh session, want false")
		}
	})

	t.Run("done after advancing past last item", func(t *testing.T) {
		s := makeSession("u1", []string{"w1"})
		s.Advance()
		if !s.Done() {
			t.Error("Done() = false after last item, want true")
		}
	})

	t.Run("not done in middle of session", func(t *testing.T) {
		s := makeSession("u1", []string{"w1", "w2", "w3"})
		s.Advance()
		if s.Done() {
			t.Error("Done() = true in middle of session, want false")
		}
	})
}

func TestSession_CurrentAdvanceDoneIntegration(t *testing.T) {
	s := makeSession("u1", []string{"w1", "w2"})

	if s.Done() {
		t.Fatal("session should not be done at start")
	}

	item := s.Current()
	if item == nil || item.WordID != "w1" {
		t.Fatalf("expected w1, got %v", item)
	}

	s.Advance()

	item = s.Current()
	if item == nil || item.WordID != "w2" {
		t.Fatalf("expected w2, got %v", item)
	}
	if s.Done() {
		t.Fatal("session should not be done after first advance")
	}

	s.Advance()

	if !s.Done() {
		t.Fatal("session should be done after all items consumed")
	}
	if s.Current() != nil {
		t.Fatal("Current() should return nil when done")
	}
}
