using System;
using System.Collections.Generic;
using System.Linq;
using System.Timers;

namespace Figurkoder.Domain
{
    public sealed class GameEngine
    {
        private readonly Timer _timer;
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
        public event EventHandler<EventArgs>? GameFinished;

        public GameEngine()
        {
            _timer = new Timer();
            _timer.Elapsed += TimerElapsed;
        }

        public void Start(Game game)
        {
            OnStart(game);
            UpdateCurrent();
        }

        private void TimerElapsed(object sender, ElapsedEventArgs e)
        {
            UpdateCurrent();
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

            _timer.Start();
        }

        private void OnFinished(EventArgs e)
        {
            _timer.Stop();

            GameFinished?.Invoke(this, e);
        }

        private void UpdateCurrent()
        {
            if (_counter >= _flashCards.Length)
            {
                OnFinished(EventArgs.Empty);

                return;
            }

            _counter++;

            var e = new CurrentEventArgs(_counter, _flashCards[_counter-1]);

            Current?.Invoke(this, e);
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
