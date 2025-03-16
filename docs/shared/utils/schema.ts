import * as v from 'valibot'

export function topicSubUnsub<
  TInput,
  TOutput,
  TIssue extends v.BaseIssue<TInput>,
  TSchema extends v.BaseSchema<TInput, TOutput, TIssue>,
>(topics?: TSchema) {
  return v.object({
    type: v.picklist(['subscribe', 'unsubscribe']),
    topic: !topics ? v.string() : topics,
  })
}

export function topicPublish<
  PInput,
  POutput,
  PIssue extends v.BaseIssue<PInput>,
  PSchema extends v.BaseSchema<PInput, POutput, PIssue>,
  TInput,
  TOutput,
  TIssue extends v.BaseIssue<TInput>,
  TSchema extends v.BaseSchema<TInput, TOutput, TIssue>,
>(payload: PSchema, topics?: TSchema) {
  return v.object({
    type: v.literal('publish'),
    topic: !topics ? v.string() : topics,
    payload,
  })
}
