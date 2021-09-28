﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Timers;
using Microsoft.Extensions.Logging;
using static Figurkoder.Domain.GameEngine.State;

namespace Figurkoder.Domain
{
    public sealed class GameEngineFactory
    {
        private readonly ILoggerFactory _loggerFactory;

        public GameEngineFactory(ILoggerFactory loggerFactory)
        {
            ArgumentNullException.ThrowIfNull(loggerFactory);

            _loggerFactory = loggerFactory;
        }

        public GameEngine Create(Game game) => new(_loggerFactory.CreateLogger<GameEngine>(), game);
    }

    public sealed class GameEngine
    {
        private readonly Stopwatch _stopwatch = new();
        private readonly Timer _timer = new();
        private readonly List<(Flashcard Flashcard, TimeSpan? Time)> _showedFlashcards = new();
        private readonly ILogger<GameEngine> _logger;
        private readonly double _intervalInMilliseconds;
        private readonly Flashcard[] _flashcards;

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

        public GameEngine(ILogger<GameEngine> logger, Game settings)
        {
            ArgumentNullException.ThrowIfNull(logger);
            
            _logger = logger;

            if (settings.Flashcards.Length == 0)
            {
                throw new ArgumentException("Missing flashcards!", nameof(settings));
            }

            if (settings.Flashcards.Length != settings.Flashcards.Distinct().Count())
            {
                throw new ArgumentException("Duplicated flashcards!", nameof(settings));
            }

            _timer.Elapsed += TimerElapsed;
            CurrentState += OnStateChanged;

            _intervalInMilliseconds = settings.FlashTime.TotalMilliseconds;
            _timer.Interval = _intervalInMilliseconds;

            _flashcards = new Flashcard[settings.Flashcards.Length];

            settings.Flashcards.CopyTo(_flashcards, 0);

            if (settings.Randomize)
            {
                Shuffle(_flashcards);
            }
        }

        public void Start()
        {
            _logger.LogDebug(nameof(Start) + ": State is currently {State}", _state);

            switch (_state)
            {
                case NotStarted:
                    Advance(TimeSpan.Zero);
                    break;
                case Paused:
                    ChangeState(Running);
                    _timer.Start();
                    _stopwatch.Start();
                    break;
                case Running:
                case Revealed:
                    return;
                case Finished:
                    ChangeState(Running);
                    _counter = 0;
                    _showedFlashcards.Clear();
                    Advance(TimeSpan.Zero);
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Pause()
        {
            _logger.LogDebug(nameof(Pause) + ": State is currently {State}", _state);

            switch (_state)
            {
                case NotStarted:
                case Paused:
                case Finished:
                case Revealed:
                    return;
                case Running:
                    ChangeState(Paused);
                    _stopwatch.Stop();
                    _timer.Stop();
                    _timer.Interval = _intervalInMilliseconds - _stopwatch.ElapsedMilliseconds;
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Reveale()
        {
            _logger.LogDebug(nameof(Reveale) + ": State is currently {State}", _state);

            switch (_state)
            {
                case NotStarted:
                case Revealed:
                case Finished:
                    return;
                case Paused:
                case Running:
                    ChangeState(Revealed);
                    _stopwatch.Stop();
                    _timer.Stop();
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Next()
        {
            _logger.LogDebug(nameof(Next) + ": State is currently {State}", _state);

            switch (_state)
            {
                case Finished:
                    return;
                case NotStarted:
                case Revealed:
                case Paused:
                case Running:
                    Advance(null, false);
                    break;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }
        }

        public void Stop()
        {
            _logger.LogDebug(nameof(Stop) + ": State is currently {State}", _state);

            switch (_state)
            {
                case Running:
                case Paused:
                case Revealed:
                    break;
                case NotStarted:
                case Finished:
                    return;
                default:
                    throw new InvalidOperationException("Unknown state.");
            }

            ChangeState(Finished);

            _timer.Stop();
            _stopwatch.Stop();

            _logger.LogDebug("Will collect result");


            var orderedResult = new Result[_flashcards.Length];

            _logger.LogDebug("We showed {FlashCardCount} flash cards", _showedFlashcards.Count);

            foreach (var (flashcard, time) in _showedFlashcards)
            {
                _logger.LogDebug("Adding {Flashcard} with time {Time} to result", flashcard.Key, time);
                orderedResult[Array.IndexOf(_flashcards, flashcard)] = new(flashcard, time);
            }

            foreach (var pair in _flashcards.Except(_showedFlashcards.Select(x => x.Flashcard)))
            {
                _logger.LogDebug("Adding {Flashcard} to result", pair.Key);
                orderedResult[Array.IndexOf(_flashcards, pair)] = new(pair, null);
            }

            _logger.LogDebug("Invoking {Event} with a result of {FlashCardCount}", nameof(GameFinished), orderedResult.Where(x => x is not null).Count());
            GameFinished?.Invoke(this, new GameFinishedEventArgs(orderedResult));
        }

        private void Advance(TimeSpan? time = null, bool failed = false)
        {
            _logger.LogDebug(nameof(Advance) + ": State is currently {State}", _state);

            _timer.Stop();
            _stopwatch.Stop();

            if (_state is Revealed)
            {
                failed = true;
            }

            // TODO: If pressing next when paused the game should just trigger next and resume
            if (_state != Running)
            {
                ChangeState(Running);
            }

            // Reset interval if it was changed
            _timer.Interval = _intervalInMilliseconds;

            // Add previous, if any, to result
            if (_counter > 0)
            {
                _showedFlashcards.Add((
                    _flashcards[_counter - 1],
                    failed ? null : time ?? _stopwatch.Elapsed));
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
            Current?.Invoke(this, e);
            _logger.LogDebug("Updated current flashcard to {Flashcard}", e.Current.Key);

            // Reset timer and stopwatch
            if (!_timer.Enabled)
            {
                _timer.Start();
            }
            _stopwatch.Restart();
        }

        private void TimerElapsed(object? sender, ElapsedEventArgs e)
        {
            _logger.LogDebug(nameof(TimerElapsed));

            Advance(failed: true);
        }

        /// <summary>
        /// Fisher–Yates shuffle
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="array"></param>
        private static void Shuffle<T>(T[] array)
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
            _logger.LogDebug("Changing state to {state}", state);

            CurrentState?.Invoke(this, new StateEventArgs(state));
        }

        private void OnStateChanged(object? _, StateEventArgs e)
        {
            _state = e.CurrentState;

            _logger.LogDebug("Changed state to {state}", _state);
        }

#pragma warning disable IDE0055 // Fix formatting
        public enum State
        {
            NotStarted = 0,
            Running    = 1,
            Paused     = 1 << 1,
            Revealed   = 1 << 2,
            Finished   = 1 << 3
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
        public Flashcard Current { get; }

        public CurrentEventArgs(int count, Flashcard current)
        {
            Count = count;
            Current = current;
        }
    }

    public sealed class GameFinishedEventArgs : EventArgs
    {
        public TimeSpan? Average { get; }
        public Result[] Results { get; }

        public GameFinishedEventArgs(Result[] results)
        {
            Results = results;

            var times = results
                .Where(x => x.Time.HasValue)
                .Select(x => x.Time!.Value);

            if (times.Any())
            {
                Average = TimeSpan.FromMilliseconds(times.Average(x => x.TotalMilliseconds));
            }
        }
    }

    public sealed record Flashcard(string Key, string Mnemonic);
    public sealed record Result(Flashcard Flashcard, TimeSpan? Time);
    public sealed record Game(TimeSpan FlashTime, Flashcard[] Flashcards, bool Randomize);
}
