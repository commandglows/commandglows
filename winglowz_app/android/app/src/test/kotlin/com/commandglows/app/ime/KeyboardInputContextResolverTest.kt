package com.commandglows.app.ime

import android.text.InputType
import android.view.inputmethod.EditorInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardInputContextResolverTest {
    @Test
    fun `declared email url and password fields resolve to non text contexts`() {
        assertEquals(
            KeyboardFieldContextMode.Email,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS),
        )
        assertEquals(
            KeyboardFieldContextMode.Email,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS),
        )
        assertEquals(
            KeyboardFieldContextMode.Url,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI),
        )
        assertEquals(
            KeyboardFieldContextMode.Password,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD),
        )
        assertEquals(
            KeyboardFieldContextMode.Password,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD),
        )
        assertEquals(
            KeyboardFieldContextMode.Password,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD),
        )
    }

    @Test
    fun `plain text fields remain text even when they may contain an email address`() {
        assertEquals(
            KeyboardFieldContextMode.Text,
            resolve(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL),
        )
        assertTrue(
            context(InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL)
                .typingCorrectionsAllowed,
        )
    }

    @Test
    fun `search action only applies to generic text fields`() {
        assertEquals(
            KeyboardFieldContextMode.Search,
            resolve(
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL,
                imeOptions = EditorInfo.IME_ACTION_SEARCH,
            ),
        )
        assertEquals(
            KeyboardFieldContextMode.Email,
            resolve(
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,
                imeOptions = EditorInfo.IME_ACTION_SEARCH,
            ),
        )
    }

    @Test
    fun `technical plain text hints suppress typing corrections without changing layout context`() {
        listOf(
            "Username",
            "Code OTP",
            "Nom de domaine",
            "API key",
            "IBAN",
            "Code promo",
        ).forEach { hint ->
            val context =
                context(
                    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL,
                    hintText = hint,
                )

            assertEquals(KeyboardFieldContextMode.Text, context.fieldContext)
            assertFalse(context.typingCorrectionsAllowed)
        }
    }

    @Test
    fun `android no suggestions and filter fields suppress typing corrections`() {
        assertFalse(
            context(
                InputType.TYPE_CLASS_TEXT or
                    InputType.TYPE_TEXT_VARIATION_NORMAL or
                    InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS,
            ).typingCorrectionsAllowed,
        )
        assertFalse(
            context(
                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_FILTER,
            ).typingCorrectionsAllowed,
        )
    }

    private fun resolve(
        inputType: Int,
        imeOptions: Int = EditorInfo.IME_ACTION_NONE,
    ): KeyboardFieldContextMode {
        return context(inputType = inputType, imeOptions = imeOptions).fieldContext
    }

    private fun context(
        inputType: Int,
        imeOptions: Int = EditorInfo.IME_ACTION_NONE,
        hintText: String? = null,
        privateImeOptions: String? = null,
    ): KeyboardInputContext {
        return KeyboardInputContextResolver.resolve(
            EditorInfo().apply {
                this.inputType = inputType
                this.imeOptions = imeOptions
                this.hintText = hintText
                this.privateImeOptions = privateImeOptions
            },
        )
    }
}
