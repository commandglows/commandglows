package com.commandglows.app.ime

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardCrashReporterTest {
    @Test
    fun `diagnostic redacts sensitive values and keeps allowlisted context`() {
        val diagnostic =
            KeyboardCrashReporter.buildDiagnostic(
                crashContext =
                    KeyboardCrashContext(
                        actionId = "dispatch:panel-#+=",
                        panel = "Settings",
                        mode = "Symbols",
                        layoutProfile = "QWERTY",
                        compactMode = false,
                        heightScale = 1.0f,
                        themePresetId = "system",
                        themeSource = "solid",
                        privateMode = true,
                    ),
                error = IllegalStateException("token=abc123 user test@example.com"),
                timestamp = "2026-05-16T08:00:00Z",
                count = 4,
            )

        assertTrue(diagnostic.contains("action=dispatch:panel-#+="))
        assertTrue(diagnostic.contains("private_mode=true"))
        assertTrue(diagnostic.contains("[REDACTED_SECRET]"))
        assertTrue(diagnostic.contains("[REDACTED_EMAIL]"))
        assertFalse(diagnostic.contains("abc123"))
        assertFalse(diagnostic.contains("test@example.com"))
    }
}
