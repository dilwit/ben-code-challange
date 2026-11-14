'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  commissionQuoteRequestSchema,
  RISK_BANDS,
  type CommissionQuoteRequest,
  type CommissionQuote,
} from '../model'
import CommissionQuoteResult from './commission-quote-result'
import { generateCommissionQuoteAction } from './generate-commission-quote-action'

// The form validates with the same rules and messages as the server (model.ts), so invalid input
// is caught in the browser before anything is sent (doc 02, sections 1 and 3).
//
// Inputs hold text, but the schema expects numbers. An empty field must count as missing, not 0:
// Number('') is 0, which would show "greater than 0" for a field the user hasn't filled in.
const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text))
const emptyToUndefined = (text: string) => (text === '' ? undefined : text)

// Text in → the shared request rules and messages, unchanged.
const { shape } = commissionQuoteRequestSchema
const commissionQuoteFormSchema = z.object({
  loanAmount: z.string().transform(toNumber).pipe(shape.loanAmount),
  loanTermInMonths: z.string().transform(toNumber).pipe(shape.loanTermInMonths),
  riskBand: z.string().transform(emptyToUndefined).pipe(shape.riskBand),
})

/** What the fields hold: `{ loanAmount: string; loanTermInMonths: string; riskBand: string }`. */
type FormValues = z.input<typeof commissionQuoteFormSchema>

const RISK_BAND_LABELS: Record<(typeof RISK_BANDS)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm ' +
  'focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 ' +
  'aria-[invalid=true]:border-red-600'

export default function CommissionQuoteForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, unknown, CommissionQuoteRequest>({
    resolver: zodResolver(commissionQuoteFormSchema),
    // Errors first appear when Generate is clicked (all at once, focus on the first), then update
    // as the user types. Not on leaving a field: an error appearing then pushes the button down
    // mid-click, and the click is lost.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { loanAmount: '', loanTermInMonths: '', riskBand: '' },
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [quote, setQuote] = useState<CommissionQuote | null>(null)

  // Aborted when the form unmounts, so a request in flight is cancelled and nothing is set on
  // an unmounted component (E18).
  const unmount = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    unmount.current = controller
    return () => controller.abort()
  }, [])

  // handleSubmit only calls this when the form is valid. Otherwise it shows every field's error
  // and moves focus to the first one, so nothing is sent (E1).
  const onGenerate = async (request: CommissionQuoteRequest) => {
    setIsGenerating(true) // disables the fields and Generate, which reads "Generating…" (E5)
    setGenerationError(null) // a retry clears the previous error (E14)
    setQuote(null) // the new result replaces the old one (S3)

    const signal = unmount.current?.signal ?? new AbortController().signal
    const response = await generateCommissionQuoteAction(request, { signal })
    if (signal.aborted) return // the user left: show nothing, set no state (E18)

    setIsGenerating(false)
    if (response.status === 'success') setQuote(response.data)
    else setGenerationError(response.data.message) // the cause is already in the console
  }

  return (
    <>
      {/* handleSubmit is called on submit, not during render: onGenerate reads a ref.
          onChange: any edit to a field clears the shown quote, so a quote on screen always
          matches the form and can't be copied for the wrong loan. */}
      <form
        noValidate
        onSubmit={(event) => handleSubmit(onGenerate)(event)}
        onChange={() => setQuote(null)}
        className="mt-6"
      >
        {/* Disabled while generating, so the values can't change mid-request. */}
        <fieldset disabled={isGenerating} className="space-y-5">
          <Field id="loanAmount" label="Loan amount ($)" error={errors.loanAmount?.message}>
            <input
              id="loanAmount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className={inputClass}
              aria-invalid={errors.loanAmount ? true : undefined}
              aria-describedby={errors.loanAmount ? 'loanAmount-error' : undefined}
              {...register('loanAmount')}
            />
          </Field>

          <Field
            id="loanTermInMonths"
            label="Loan term (months)"
            error={errors.loanTermInMonths?.message}
          >
            <input
              id="loanTermInMonths"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              aria-invalid={errors.loanTermInMonths ? true : undefined}
              aria-describedby={errors.loanTermInMonths ? 'loanTermInMonths-error' : undefined}
              {...register('loanTermInMonths')}
            />
          </Field>

          <Field id="riskBand" label="Risk band" error={errors.riskBand?.message}>
            <select
              id="riskBand"
              className={inputClass}
              aria-invalid={errors.riskBand ? true : undefined}
              aria-describedby={errors.riskBand ? 'riskBand-error' : undefined}
              {...register('riskBand')}
            >
              <option value="" disabled>
                Select a risk band
              </option>
              {RISK_BANDS.map((band) => (
                <option key={band} value={band}>
                  {RISK_BAND_LABELS[band]}
                </option>
              ))}
            </select>
          </Field>

          {/* Not disabled for invalid input: clicking it explains what's missing. A disabled
              button can't be focused and gives no reason. Disabled only while generating. */}
          <button
            type="submit"
            disabled={isGenerating}
            className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGenerating ? 'Generating…' : 'Generate Quote'}
          </button>
        </fieldset>

        {generationError && (
          <p
            role="alert"
            className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {generationError}
          </p>
        )}
      </form>

      {quote && <CommissionQuoteResult quote={quote} />}
    </>
  )
}

/** A label, its control, and the control's error message (linked with aria-describedby). */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
