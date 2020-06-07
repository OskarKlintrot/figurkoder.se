using System;
using System.Collections.Generic;
using System.Timers;

namespace Figurkoder.Domain
{
    public sealed class GameEngine
    {
        private readonly Timer _timer;

        /// <summary>
        /// Shows the current flash card
        /// </summary>
        public event EventHandler<EventArgs>? Current;

        /// <summary>
        /// Triggers when the game starts
        /// </summary>
        public event EventHandler<EventArgs>? GameStart;

        public GameEngine()
        {
            _timer = new Timer();
            _timer.Elapsed += TimerElapsed;
        }

        public void Start(Game newGame)
        {
            _timer.Interval = newGame.FlashTime.TotalMilliseconds;

            _timer.Start();

            OnStart(EventArgs.Empty);
            OnShowNext(EventArgs.Empty);
        }

        private void TimerElapsed(object sender, ElapsedEventArgs e)
        {
            OnShowNext(e);
        }

        private void OnStart(EventArgs e)
        {
            GameStart?.Invoke(this, e);
        }

        private void OnShowNext(EventArgs e)
        {
            Current?.Invoke(this, e);
        }
    }

    public sealed class Game
    {
        public TimeSpan FlashTime { get; set; } = TimeSpan.FromSeconds(6);
    }
}
