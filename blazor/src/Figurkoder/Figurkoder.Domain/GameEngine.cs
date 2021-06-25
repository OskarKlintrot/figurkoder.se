using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Timers;
using static Figurkoder.Domain.GameEngine.State;

namespace Figurkoder.Domain
{
    public sealed class GameEngine
    {
        private readonly Stopwatch _stopwatch;
        private readonly Timer _timer;
        private readonly double _interval;
        private readonly IList<(KeyValuePair<string, string> Flashcard, TimeSpan Time)> _showedFlashcards;
        private readonly KeyValuePair<string, string>[] _originalFlashcards = Array.Empty<KeyValuePair<string, string>>();
        private readonly KeyValuePair<string, string>[] _flashcards = Array.Empty<KeyValuePair<string, string>>();

        private int _counter;
        private State _state;

        /// <summary>
        /// Shows the current flashcard
        /// </summary>
        public event EventHandler<CurrentEventArgs>? Current;

        /// <summary>
        /// Triggers when the game changes state
        /// </summary>
        public event EventHandler<StateEventArgs>? CurrentState;

        /// <summary>
        /// Triggers when the game has finished
        /// </summary>
        public event EventHandler<GameFinishedEventArgs>? GameFinished;

        public GameEngine(Game settings)
        {
            if (settings.Flashcards.Length == 0)
            {
                throw new ArgumentException("Missing flashcards!", nameof(settings));
            }

            _stopwatch = new Stopwatch();
            _timer = new Timer();
            _counter = 0;
            _showedFlashcards = new List<(KeyValuePair<string, string> Flashcard, TimeSpan Time)>();

            _timer.Elapsed += TimerElapsed;
            CurrentState += OnStateChanged;

            _interval = settings.FlashTime.TotalMilliseconds;
            _timer.Interval = _interval;

            _originalFlashcards = new KeyValuePair<string, string>[settings.Flashcards.Length];
            _flashcards = new KeyValuePair<string, string>[settings.Flashcards.Length];

            settings.Flashcards.CopyTo(_originalFlashcards, 0);
            settings.Flashcards.CopyTo(_flashcards, 0);

            if (settings.Randomize)
            {
                Shuffle(_flashcards);
            }
        }

        public void Start()
        {
            switch (_state)
            {
                case None:
                    _stopwatch.Restart();
                    _timer.Start();
                    Next(TimeSpan.Zero);
                    break;
                case Paused:
                    ChangeState(Resumed);
                    _timer.Start();
                    _stopwatch.Start();
                    break;
                case Running:
                    return;
                case Resumed: // TODO: Avoid issue if double tapping start here
                    Next(TimeSpan.Zero);
                    break;
                case Finished:
                    ChangeState(Running);
                    _stopwatch.Restart();
                    _timer.Start();
                    _counter = 0;
                    _showedFlashcards.Clear();
                    Next(TimeSpan.Zero);
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Pause()
        {
            switch (_state)
            {
                case None:
                case Paused:
                case Finished:
                    return;
                case Running:
                case Resumed:
                    ChangeState(Paused);
                    _stopwatch.Stop();
                    _timer.Stop();
                    _timer.Interval = _interval - _stopwatch.ElapsedMilliseconds;
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Next(TimeSpan? time = null)
        {
            // TODO: If pressing next when paused the game should just trigger next and resume
            if (_state != Running)
            {
                ChangeState(Running);
            }

            // Reset interval if it was changed
            _timer.Interval = _interval;

            // Add previous, if any, to result
            if (_counter > 0)
            {
                _showedFlashcards.Add((_flashcards[_counter - 1], time ?? _stopwatch.Elapsed));
            }

            // Check if we have any flashcards left
            if (_counter >= _flashcards.Length)
            {
                Stop();

                return;
            }

            // Next flashcard
            _counter++;

            var e = new CurrentEventArgs(_counter, _flashcards[_counter - 1]);

            // Reset timer and stopwatch
            Current?.Invoke(this, e);
            if (!_timer.Enabled)
            {
                _timer.Start();
            }
            _stopwatch.Restart();
        }

        public void Stop()
        {
            switch (_state)
            {
                case Running:
                case Paused:
                case Resumed:
                    break;
                case None:
                case Finished:
                    return;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }

            ChangeState(Finished);

            _timer.Stop();
            _stopwatch.Stop();

            var orderedResult = new (KeyValuePair<string, string> Flashcard, TimeSpan? Time)[_originalFlashcards.Length];

            foreach (var item in _showedFlashcards)
            {
                orderedResult[Array.IndexOf(_originalFlashcards, item.Flashcard)] = item;
            }

            foreach (var item in _flashcards.Except(_showedFlashcards.Select(x => x.Flashcard)))
            {
                orderedResult[Array.IndexOf(_originalFlashcards, item)] = (item, null);
            }

            GameFinished?.Invoke(this, new GameFinishedEventArgs(orderedResult));
        }

        private void TimerElapsed(object sender, ElapsedEventArgs e)
        {
            Next(TimeSpan.FromMilliseconds(_timer.Interval));
        }

        /// <summary>
        /// Fisher–Yates shuffle
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="array"></param>
        private void Shuffle<T>(T[] array)
        {
            var rng = new Random();
            var n = array.Length;

            while (n > 1)
            {
                int k = rng.Next(n--);
                T temp = array[n];
                array[n] = array[k];
                array[k] = temp;
            }
        }

        private void ChangeState(State state)
        {
            CurrentState?.Invoke(this, new StateEventArgs(state));
        }

        private void OnStateChanged(object _, StateEventArgs e)
        {
            _state = e.CurrentState;
        }

#pragma warning disable IDE0055 // Fix formatting
        [Flags]
        public enum State
        {
            None     = 0,
            Running  = 1,
            Paused   = 1 << 1,
            Resumed  = 1 << 2,
            Finished = 1 << 3
        }
#pragma warning restore IDE0055
    }

    public sealed class StateEventArgs : EventArgs
    {
        public GameEngine.State CurrentState { get; }

        public StateEventArgs(GameEngine.State state)
        {
            CurrentState = state;
        }
    }

    public sealed class CurrentEventArgs : EventArgs
    {
        public int Count { get; }
        public KeyValuePair<string, string> Current { get; }

        public CurrentEventArgs(int count, KeyValuePair<string, string> current)
        {
            Count = count;
            Current = current;
        }
    }

    public sealed class GameFinishedEventArgs : EventArgs
    {
        public TimeSpan? Average { get; }
        public (KeyValuePair<string, string> Flashcard, TimeSpan? Time)[] Result { get; }

        public GameFinishedEventArgs((KeyValuePair<string, string> Flashcard, TimeSpan? Time)[] result)
        {
            Result = result;

            var times = result
                .Where(x => x.Time.HasValue)
                .Select(x => x.Time!.Value);

            if (times.Any())
            {
                Average = TimeSpan.FromMilliseconds(times.Average(x => x.TotalMilliseconds));
            }
        }
    }

    public sealed record Game(TimeSpan FlashTime, KeyValuePair<string, string>[] Flashcards, bool Randomize);
}
