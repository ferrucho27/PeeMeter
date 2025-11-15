
import React, { useState, useCallback, useMemo } from 'react';
import { LogEntry } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { PlusIcon, CopyIcon, TrashIcon } from './components/Icons';

// Helper function to format dates and times in Spanish
const formatTimestamp = (timestamp: number, options: Intl.DateTimeFormatOptions): string => {
    return new Intl.DateTimeFormat('es-ES', options).format(new Date(timestamp));
};

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
            // A bit of a hack to sort dates correctly, by using the timestamp of the first entry of that day
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


const App: React.FC = () => {
    const [log, setLog] = useLocalStorage<LogEntry[]>('urinationLog', []);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage(null);
        }, 2000);
    };

    const handleLogUrination = useCallback(() => {
        const newEntry: LogEntry = {
            id: Date.now(),
            timestamp: Date.now()
        };
        setLog(prevLog => [newEntry, ...prevLog]);
        showToast("¡Registro guardado!");
    }, [setLog]);

    const handleCopyToClipboard = useCallback(() => {
        if (log.length === 0) {
            showToast("No hay nada que copiar.");
            return;
        }
        
        const textToCopy = log.map(entry => {
            const date = formatTimestamp(entry.timestamp, { dateStyle: 'full' });
            const time = formatTimestamp(entry.timestamp, { timeStyle: 'medium' });
            return `${date} - ${time}`;
        }).join('\n');

        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast("¡Copiado al portapapeles!"))
            // FIX: Corrected syntax for the arrow function in the catch block.
            .catch(() => showToast("Error al copiar."));

    }, [log]);

    const handleClearLog = useCallback(() => {
        if (window.confirm("¿Estás seguro de que quieres borrar todos los registros? Esta acción no se puede deshacer.")) {
            setLog([]);
            showToast("Registro borrado.");
        }
    }, [setLog]);
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20 w-full p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Registro de Micción</h1>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleCopyToClipboard}
                        disabled={log.length === 0}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Copiar registros"
                    >
                        <CopyIcon />
                    </button>
                    <button
                        onClick={handleClearLog}
                        disabled={log.length === 0}
                        className="p-2 rounded-full text-red-500 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Borrar registros"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </header>

            <main className="p-4">
                <LogList entries={log} />
            </main>
            
            <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center pointer-events-none">
                 <button
                    onClick={handleLogUrination}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full h-16 w-16 flex items-center justify-center shadow-xl transform hover:scale-110 transition-all pointer-events-auto"
                    aria-label="Registrar nueva micción"
                >
                    <PlusIcon className="w-8 h-8"/>
                </button>
            </div>
            
            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg animate-pulse">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default App;