
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { LogEntry } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { PlusIcon, CopyIcon, TrashIcon, ChartBarIcon, ListBulletIcon, XMarkIcon, InstallIcon } from './components/Icons';

// Helper function to format dates and times in Spanish
const formatTimestamp = (timestamp: number, options: Intl.DateTimeFormatOptions): string => {
    return new Intl.DateTimeFormat('es-ES', options).format(new Date(timestamp));
};

type ChartPeriod = 'week' | 'month' | 'all';

// --- Sub-components defined outside the main App component ---

interface LogListProps {
    entries: LogEntry[];
}

const LogList: React.FC<LogListProps> = ({ entries }) => {
    const groupedEntries = useMemo(() => {
        return entries.reduce((acc, entry) => {
            const date = formatTimestamp(entry.timestamp, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(entry);
            return acc;
        }, {} as Record<string, LogEntry[]>);
    }, [entries]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedEntries).sort((a, b) => {
            const dateA = groupedEntries[a][0].timestamp;
            const dateB = groupedEntries[b][0].timestamp;
            return dateB - dateA;
        });
    }, [groupedEntries]);

    if (entries.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-gray-500 dark:text-gray-400">No hay registros todavía.</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Presiona el botón '+' para empezar.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 pb-28">
            {sortedDates.map(date => (
                <div key={date}>
                    <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 capitalize bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded-t-lg sticky top-16 z-10">{date}</h2>
                    <ul className="bg-white dark:bg-gray-800/50 shadow-md rounded-b-lg divide-y divide-gray-200 dark:divide-gray-700">
                        {groupedEntries[date].sort((a, b) => b.timestamp - a.timestamp).map(entry => (
                            <li key={entry.id} className="px-4 py-3 flex justify-between items-center">
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                    {formatTimestamp(entry.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatTimestamp(entry.timestamp, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

interface LogChartProps {
    entries: LogEntry[];
    period: ChartPeriod;
    onBarClick: (date: string) => void;
}

const LogChart: React.FC<LogChartProps> = ({ entries, period, onBarClick }) => {
    const chartData = useMemo(() => {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;

        const filteredEntries = entries.filter(entry => {
            if (period === 'week') {
                return (now.getTime() - entry.timestamp) / oneDay < 7;
            }
            if (period === 'month') {
                return (now.getTime() - entry.timestamp) / oneDay < 30;
            }
            return true;
        });
        
        // FIX: Explicitly type the accumulator in the `reduce` function to resolve type inference issues.
        // FIX: Added a trailing comma to the generic type argument to disambiguate from JSX syntax, resolving the parsing error.
        const countsByDay = filteredEntries.reduce<Record<string, { count: number; date: Date }>,>((acc, entry) => {
            const date = new Date(entry.timestamp);
            date.setHours(0, 0, 0, 0);
            const dateString = date.toISOString().split('T')[0];
            
            if (!acc[dateString]) {
                acc[dateString] = { count: 0, date: date };
            }
            acc[dateString].count++;
            return acc;
        }, {});
        
        return Object.entries(countsByDay)
            .map(([dateString, { count, date }]) => ({
                label: formatTimestamp(date.getTime(), { day: 'numeric', month: 'short' }),
                value: count,
                date: date,
                fullDate: dateString,
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

    }, [entries, period]);

    if (chartData.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-gray-500 dark:text-gray-400">No hay datos para mostrar en el gráfico.</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Ajusta el período o presiona '+' para registrar.</p>
            </div>
        );
    }

    const maxValue = Math.max(...chartData.map(d => d.value), 0);
    const yAxisTop = maxValue <= 5 ? maxValue : Math.ceil(maxValue / 5) * 5;
    const numTicks = yAxisTop > 0 ? Math.min(yAxisTop, 5) : 0;
    const yAxisLabels = yAxisTop > 0 ? Array.from({ length: numTicks + 1 }, (_, i) => Math.round((yAxisTop / numTicks) * i)) : [0];

    const chartHeight = 250;
    const chartPadding = { top: 20, right: 20, bottom: 40, left: 30 };
    const chartWidth = 500;

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Gráfico de barras de registros de micción por día." style={{ minWidth: `${Math.max(300, chartData.length * 50)}px` }}>
                {yAxisLabels.map((label, i) => {
                    const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - label / (yAxisTop || 1));
                    return (
                        <g key={i}>
                            <text x={chartPadding.left - 8} y={y} textAnchor="end" dy="0.3em" className="text-xs fill-current text-gray-500 dark:text-gray-400">{label}</text>
                            <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" />
                        </g>
                    );
                })}

                {chartData.map((d, i) => {
                    const barWidth = (chartWidth - chartPadding.left - chartPadding.right) / chartData.length * 0.6;
                    const x = chartPadding.left + i * ((chartWidth - chartPadding.left - chartPadding.right) / chartData.length) + barWidth * 0.33;
                    const barHeight = Math.max(0, (chartHeight - chartPadding.top - chartPadding.bottom) * (d.value / (yAxisTop || 1)));
                    const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) - barHeight;

                    return (
                        <g key={d.label} onClick={() => onBarClick(d.fullDate)} className="cursor-pointer group">
                            <title>{`${d.label}: ${d.value} ${d.value === 1 ? 'vez' : 'veces'}`}</title>
                            <rect x={x} y={y} width={barWidth} height={barHeight} className="fill-current text-blue-500 group-hover:text-blue-400 transition-colors" />
                            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="text-xs font-bold fill-current text-gray-700 dark:text-gray-200">{d.value}</text>
                            <text x={x + barWidth / 2} y={chartHeight - chartPadding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">{d.label}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

interface DetailsModalProps {
    dayData: LogEntry[];
    onClose: () => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ dayData, onClose }) => {
    if (!dayData || dayData.length === 0) return null;

    const modalDate = formatTimestamp(dayData[0].timestamp, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold capitalize">{modalDate}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <ul className="p-4 max-h-[60vh] overflow-y-auto">
                    {dayData.sort((a,b) => b.timestamp - a.timestamp).map(entry => (
                         <li key={entry.id} className="py-2 flex justify-between items-center border-b dark:border-gray-700/50 last:border-b-0">
                            <span className="font-medium">Hora:</span>
                            <span>{formatTimestamp(entry.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                         </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [log, setLog] = useLocalStorage<LogEntry[]>('urinationLog', []);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'chart'>('list');
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('all');
    const [selectedDayData, setSelectedDayData] = useState<LogEntry[] | null>(null);
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

    useEffect(() => {
        // PWA: Service Worker registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }

        // PWA: "Add to home screen" prompt
        const beforeInstallPromptHandler = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
        };
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleInstall = async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            showToast('¡App instalada! Búscala en tu pantalla de inicio.');
        }
        setInstallPromptEvent(null);
    };

    const handleLogUrination = useCallback(() => {
        setLog(prevLog => [{ id: Date.now(), timestamp: Date.now() }, ...prevLog]);
        showToast("¡Registro guardado!");
    }, [setLog]);

    const handleCopyToClipboard = useCallback(() => {
        if (log.length === 0) {
            showToast("No hay nada que copiar.");
            return;
        }
        const textToCopy = log.map(entry => `${formatTimestamp(entry.timestamp, { dateStyle: 'full' })} - ${formatTimestamp(entry.timestamp, { timeStyle: 'medium' })}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => showToast("¡Copiado al portapapeles!")).catch(() => showToast("Error al copiar."));
    }, [log]);

    const handleClearLog = useCallback(() => {
        if (window.confirm("¿Estás seguro de que quieres borrar todos los registros? Esta acción no se puede deshacer.")) {
            setLog([]);
            showToast("Registro borrado.");
        }
    }, [setLog]);

    const handleBarClick = useCallback((dateString: string) => {
        const dayEntries = log.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            entryDate.setHours(0,0,0,0);
            return entryDate.toISOString().split('T')[0] === dateString;
        });
        setSelectedDayData(dayEntries);
    }, [log]);
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans relative">
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-blue-800 dark:text-blue-300">Registro de Micción</h1>
                    <div className="flex items-center space-x-2">
                        {log.length > 0 && (
                            <>
                                <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                                    <button
                                        onClick={() => setView('list')}
                                        className={`p-1.5 rounded-full transition-colors ${view === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                                        aria-label="Vista de lista"
                                    >
                                        <ListBulletIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setView('chart')}
                                        className={`p-1.5 rounded-full transition-colors ${view === 'chart' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                                        aria-label="Vista de gráfico"
                                    >
                                        <ChartBarIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCopyToClipboard}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Copiar registros"
                                >
                                    <CopyIcon />
                                </button>
                                <button
                                    onClick={handleClearLog}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Borrar registros"
                                >
                                    <TrashIcon />
                                </button>
                            </>
                        )}
                        {installPromptEvent && (
                            <button
                                onClick={handleInstall}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Instalar aplicación"
                            >
                                <InstallIcon />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4">
                {view === 'list' ? (
                    <LogList entries={log} />
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-center items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1 max-w-xs mx-auto">
                            {(['week', 'month', 'all'] as ChartPeriod[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p)}
                                    className={`flex-1 px-3 py-1 text-sm font-semibold rounded-full transition-colors ${chartPeriod === p ? 'bg-blue-500 text-white shadow' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    {p === 'week' && 'Semana'}
                                    {p === 'month' && 'Mes'}
                                    {p === 'all' && 'Todos'}
                                </button>
                            ))}
                        </div>
                        <LogChart entries={log} period={chartPeriod} onBarClick={handleBarClick} />
                    </div>
                )}
            </main>

            <button
                onClick={handleLogUrination}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-full shadow-lg z-30 transform transition-transform active:scale-95"
                aria-label="Añadir registro de micción"
            >
                <PlusIcon className="w-8 h-8" />
            </button>

            {toastMessage && (
                <div className="fixed bottom-24 right-6 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-40 animate-fade-in-out">
                    {toastMessage}
                </div>
            )}

            {selectedDayData && (
                <DetailsModal dayData={selectedDayData} onClose={() => setSelectedDayData(null)} />
            )}
        </div>
    );
};

export default App;