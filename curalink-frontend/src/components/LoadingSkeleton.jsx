function Bone({ className = '' }) {
  return <div className={`shimmer rounded-lg ${className}`} />
}

function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <Bone className="h-4 w-16" />
        <Bone className="h-5 w-20 rounded-full" />
      </div>
      <Bone className="h-5 w-full" />
      <Bone className="h-5 w-4/5" />
      <div className="space-y-2 pt-1">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-11/12" />
        <Bone className="h-3.5 w-3/4" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Bone className="h-3 w-24" />
        <Bone className="h-3 w-16" />
      </div>
    </div>
  )
}

function AnswerSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <Bone className="w-8 h-8 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Bone className="h-4 w-48" />
          <Bone className="h-3 w-32" />
        </div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
          <Bone className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  )
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Meta bar */}
      <div className="flex items-center gap-3">
        <Bone className="h-3 w-32" />
        <Bone className="h-3 w-24" />
        <Bone className="h-3 w-16" />
      </div>

      {/* Structured answer */}
      <AnswerSkeleton />

      {/* Publications grid */}
      <div>
        <Bone className="h-4 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>

      {/* Trials */}
      <div>
        <Bone className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )
}