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
        private readonly IList<(KeyValuePair<string, string> FlashCard, TimeSpan Time)> _result;
        private int _counter;
        private KeyValuePair<string, string>[] _flashCards = Array.Empty<KeyValuePair<string, string>>();

        /// <summary>
        /// Shows the current flash card
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
            _result = new List<(KeyValuePair<string, string> FlashCard, TimeSpan Time)>();

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
                _result.Add((_flashCards[_counter - 1], time ?? _stopwatch.Elapsed));
            }

            // Check if we have any flash cards left
            if (_counter >= _flashCards.Length)
            {
                OnFinished();

                return;
            }

            // Next flash card
            _counter++;

            var e = new CurrentEventArgs(_counter, _flashCards[_counter - 1]);

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

            _flashCards = game.FlashCards;

            if (_flashCards.Length == 0)
            {
                throw new ArgumentException("Missing flash cards!", nameof(game));
            }

            GameStart?.Invoke(this, EventArgs.Empty);

            _stopwatch.Restart();
            _timer.Start();
        }

        private void OnFinished()
        {
            _timer.Stop();

            var result = new GameFinishedEventArgs(_result.ToArray());

            GameFinished?.Invoke(this, result);
        }
    }

    public sealed class CurrentEventArgs : EventArgs
    {
        public int Count { get; }
        public int TotalCount { get; }
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
        public (KeyValuePair<string, string> FlashCard, TimeSpan Time)[] Result { get; }

        public GameFinishedEventArgs((KeyValuePair<string, string> FlashCard, TimeSpan Time)[] result)
        {
            Result = result;

            Average = TimeSpan.FromMilliseconds(result
                .Select(x => x.Time)
                .Average(x => x.TotalMilliseconds));
        }
    }

    public sealed class Game
    {
        public Game(TimeSpan flashTime, KeyValuePair<string, string>[] flashCards)
        {
            FlashTime = flashTime;
            FlashCards = flashCards;
        }

        public TimeSpan FlashTime { get; }

        public KeyValuePair<string, string>[] FlashCards { get; }
    }
}
