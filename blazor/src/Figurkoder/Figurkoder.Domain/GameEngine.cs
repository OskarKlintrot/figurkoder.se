using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Timers;

namespace Figurkoder.Domain
{
    public sealed class GameEngine
    {
        private readonly Stopwatch _stopwatch;
        private readonly Timer _timer;
        private readonly IList<(KeyValuePair<string, string> Flashcard, TimeSpan Time)> _showedFlashcards;

        private int _counter;
        private KeyValuePair<string, string>[] _flashcards = Array.Empty<KeyValuePair<string, string>>();
        private KeyValuePair<string, string>[] _originalFlashcards = Array.Empty<KeyValuePair<string, string>>();

        /// <summary>
        /// Shows the current flashcard
        /// </summary>
        public event EventHandler<CurrentEventArgs>? Current;

        /// <summary>
        /// Triggers when the game starts
        /// </summary>
        public event EventHandler<EventArgs>? GameStart;

        /// <summary>
        /// Triggers when the game has finished
        /// </summary>
        public event EventHandler<GameFinishedEventArgs>? GameFinished;

        public GameEngine()
        {
            _stopwatch = new Stopwatch();
            _timer = new Timer();
            _showedFlashcards = new List<(KeyValuePair<string, string> Flashcard, TimeSpan Time)>();

            _timer.Elapsed += TimerElapsed;
        }

        public void Start(Game game)
        {
            OnStart(game);
            Next(TimeSpan.Zero);
        }

        public void Next(TimeSpan? time = null)
        {
            // Add previous, if any, to result
            if (_counter > 0)
            {
                _showedFlashcards.Add((_flashcards[_counter - 1], time ?? _stopwatch.Elapsed));
            }

            // Check if we have any flashcards left
            if (_counter >= _flashcards.Length)
            {
                OnFinished();

                return;
            }

            // Next flashcard
            _counter++;

            var e = new CurrentEventArgs(_counter, _flashcards[_counter - 1]);

            // Reset timer and stopwatch
            Current?.Invoke(this, e);
            _stopwatch.Restart();
        }

        private void TimerElapsed(object sender, ElapsedEventArgs e)
        {
            Next(TimeSpan.FromMilliseconds(_timer.Interval));
        }

        private void OnStart(Game game)
        {
            _counter = 0;

            _timer.Interval = game.FlashTime.TotalMilliseconds;

            _originalFlashcards = new KeyValuePair<string, string>[game.Flashcards.Length];
            _flashcards = new KeyValuePair<string, string>[game.Flashcards.Length];

            game.Flashcards.CopyTo(_originalFlashcards, 0);
            game.Flashcards.CopyTo(_flashcards, 0);

            if (game.Randomize)
            {
                Shuffle(_flashcards);
            }

            if (_flashcards.Length == 0)
            {
                throw new ArgumentException("Missing flashcards!", nameof(game));
            }

            GameStart?.Invoke(this, EventArgs.Empty);

            _stopwatch.Restart();
            _timer.Start();
        }

        private void OnFinished()
        {
            _timer.Stop();

            var orderedResult = new (KeyValuePair<string, string> Flashcard, TimeSpan Time)[_showedFlashcards.Count];

            foreach (var item in _showedFlashcards)
            {
                orderedResult[Array.IndexOf(_originalFlashcards, item.Flashcard)] = item;
            }

            GameFinished?.Invoke(this, new GameFinishedEventArgs(orderedResult));
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
        public TimeSpan Average { get; }
        public (KeyValuePair<string, string> Flashcard, TimeSpan Time)[] Result { get; }

        public GameFinishedEventArgs((KeyValuePair<string, string> Flashcard, TimeSpan Time)[] result)
        {
            Result = result;

            Average = TimeSpan.FromMilliseconds(result
                .Select(x => x.Time)
                .Average(x => x.TotalMilliseconds));
        }
    }

    public sealed class Game
    {
        public Game(TimeSpan flashTime, KeyValuePair<string, string>[] flashcards, bool randomize)
        {
            FlashTime = flashTime;
            Flashcards = flashcards;
            Randomize = randomize;
        }

        public TimeSpan FlashTime { get; }
        public KeyValuePair<string, string>[] Flashcards { get; }
        public bool Randomize { get; }
    }
}
