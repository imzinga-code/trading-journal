import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 에러 바운더리 컴포넌트
 * React 트리에서 발생한 에러를 잡아서 폴백 UI를 보여줍니다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('에러 바운더리에서 잡힌 에러:', error, errorInfo);
    
    // 프로덕션 환경에서는 에러 로깅 서비스로 전송
    // 예: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full mx-4">
            <div className="text-center">
              {/* 에러 아이콘 */}
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg 
                  className="w-10 h-10 text-rose-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>

              {/* 에러 메시지 */}
              <h1 className="text-2xl font-black text-slate-800 mb-3">
                오류가 발생했습니다
              </h1>
              <p className="text-sm text-slate-500 mb-8">
                예상치 못한 오류가 발생했습니다.<br />
                페이지를 새로고침하면 정상적으로 작동할 수 있습니다.
              </p>

              {/* 개발 환경에서만 에러 세부사항 표시 */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800">
                    에러 세부사항 보기
                  </summary>
                  <pre className="mt-3 p-4 bg-slate-100 rounded-xl text-xs text-slate-700 overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              {/* 액션 버튼 */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={this.handleReset}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  페이지 새로고침
                </button>
                
                <button 
                  onClick={() => window.history.back()}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
                >
                  이전 페이지로
                </button>
              </div>

              {/* 문의 링크 */}
              <p className="mt-8 text-xs text-slate-400">
                문제가 지속되면 개발자에게 문의해주세요
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
